const bedrock = require('bedrock-protocol');
const http = require('http');

// ─── 1. سيرفر وهمي محسّن لمنع إغلاق الاستضافة ───
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Bot is alive! Uptime: " + process.uptime() + "s");
});

server.listen(process.env.PORT || 3000, () => {
    console.log('🌐 HTTP Keep-Alive Server running on port', process.env.PORT || 3000);
});

// ─── 2. إعدادات البوت ───
const botOptions = {
    host: 'gold.magmanode.com',
    port: 26354,
    username: 'ServerKeeper_Bot',
    offline: true,
    // إضافة timeout أطول لتجنب قطع الاتصال المبكر
    closeTimeout: 120000 
};

let client = null;
let reconnectTimer = null;
let afkTimer = null;
let healthCheckTimer = null;
let reconnectAttempts = 0;
let isReconnecting = false;
let botStartTime = Date.now();

// ─── 3. نظام إعادة الاتصال الذكي (Backoff) ───
function getReconnectDelay() {
    // تأخير متزايد: 10s, 20s, 30s, 60s, 120s, ثم ثابت 5 دقائق
    const delays = [10000, 20000, 30000, 60000, 120000, 300000];
    return delays[Math.min(reconnectAttempts, delays.length - 1)];
}

function clearAllTimers() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    if (afkTimer) { clearInterval(afkTimer); afkTimer = null; }
    if (healthCheckTimer) { clearInterval(healthCheckTimer); healthCheckTimer = null; }
}

// ─── 4. إرسال حركة وهمية لمنع AFK Kick ───
function sendAntiAFK() {
    if (!client || client.closed) return;
    
    try {
        // إرسال حركة "تلويح باليد" (Swing Arm) كل 45 ثانية
        // هذا يخدع السيرفر ويجعله يعتقد أن اللاعب نشط
        client.queue('animate', {
            action_id: 0, // 0 = Swing Arm
            runtime_entity_id: client.entity_id || 0
        });
        
        // إرسال إشارة "On Ground" لتأكيد أن البوت موجود
        client.queue('player_action', {
            runtime_entity_id: client.entity_id || 0,
            action: 0, // 0 = Start Destroy Block (harmless)
            position: { x: 0, y: 0, z: 0 },
            result_position: { x: 0, y: 0, z: 0 },
            face: 0
        });
        
        console.log(`🤖 [${new Date().toLocaleTimeString()}] Anti-AFK ping sent.`);
    } catch (err) {
        console.error('❌ Anti-AFK error:', err.message);
    }
}

// ─── 5. فحص صحة الاتصال (Health Check) ───
function startHealthCheck() {
    healthCheckTimer = setInterval(() => {
        if (!client || client.closed) {
            console.log('⚠️ Health Check: Connection dead, forcing reconnect...');
            if (!isReconnecting) {
                clearAllTimers();
                startBot();
            }
        }
    }, 60000); // فحص كل دقيقة
}

// ─── 6. إعادة الاتصال الاحترازية كل 3 ساعات ───
// هذا يمنع مشاكل الذاكرة والاتصال المعلق (Silent Timeout)
setInterval(() => {
    if (client && !client.closed) {
        console.log('🔄 Proactive reconnect: Restarting connection to prevent silent timeout...');
        client.close();
        // سيتم إعادة الاتصال تلقائياً عبر event 'close'
    }
}, 3 * 60 * 60 * 1000); // كل 3 ساعات

// ─── 7. دالة بدء البوت الرئيسية ───
function startBot() {
    if (isReconnecting) return;
    isReconnecting = true;
    
    clearAllTimers();
    console.log(`🚀 [Attempt ${reconnectAttempts + 1}] Connecting to ${botOptions.host}:${botOptions.port}...`);
    
    try {
        client = bedrock.createClient(botOptions);
    } catch (err) {
        console.error('❌ Failed to create client:', err.message);
        scheduleReconnect();
        return;
    }

    // ─── عند الدخول للسيرفر ───
    client.on('spawn', () => {
        console.log(`✅ [${botOptions.username}] Connected successfully!`);
        reconnectAttempts = 0; // إعادة ضبط المحاولات
        isReconnecting = false;
        
        // بدء Anti-AFK: حركة كل 45 ثانية
        afkTimer = setInterval(sendAntiAFK, 45000);
        
        // بدء فحص الصحة
        startHealthCheck();
        
        // إرسال رسالة تأكيد (اختياري)
        setTimeout(() => {
            try {
                client.queue('text', {
                    type: 'chat',
                    needs_translation: false,
                    source_name: botOptions.username,
                    xuid: '',
                    platform_chat_id: '',
                    filtered_message: '',
                    message: 'ServerKeeper Bot is online! 🤖'
                });
            } catch (e) {
                // تجاهل خطأ الرسالة
            }
        }, 5000);
    });

    // ─── عند الطرد من السيرفر ───
    client.on('kick', (reason) => {
        console.log('🚫 Kicked from server:', reason);
        client.close();
    });

    // ─── عند انقطاع الاتصال ───
    client.on('close', () => {
        console.log('🔌 Connection closed.');
        isReconnecting = false;
        scheduleReconnect();
    });

    // ─── عند حدوث خطأ ───
    client.on('error', (err) => {
        console.error('❌ Protocol error:', err.message);
        // لا نغلق الاتصال هنا، نترك event 'close' يتولى الأمر
    });

    // ─── حفظ entity_id عند استلامه ───
    client.on('add_player', (packet) => {
        if (packet.username === botOptions.username) {
            client.entity_id = packet.runtime_entity_id;
            console.log('🆔 Entity ID acquired:', client.entity_id);
        }
    });
}

// ─── 8. جدولة إعادة الاتصال ───
function scheduleReconnect() {
    if (isReconnecting) return;
    isReconnecting = true;
    reconnectAttempts++;
    
    const delay = getReconnectDelay();
    console.log(`⏳ Reconnecting in ${delay / 1000}s... (Attempt ${reconnectAttempts})`);
    
    reconnectTimer = setTimeout(() => {
        isReconnecting = false;
        startBot();
    }, delay);
}

// ─── 9. إبقاء الـ Process حياً في الاستضافة (Keep Node.js Alive) ───
setInterval(() => {
    // هذا يمنع الـ Event Loop من الدخول في Sleep
    // خاصة في منصات مثل Replit و Render
    const mem = process.memoryUsage();
    console.log(`💓 Heartbeat | Memory: ${Math.round(mem.heapUsed / 1024 / 1024)}MB | Uptime: ${Math.floor(process.uptime() / 60)}min`);
}, 30000);

// ─── 10. التعامل مع إشارات إيقاف الاستضافة ───
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    if (client) client.close();
    server.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    if (client) client.close();
    server.close();
    process.exit(0);
});

// ─── بدء التشغيل ───
startBot();
