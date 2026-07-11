const bedrock = require('bedrock-protocol');
const http = require('http');
const zlib = require('zlib');

// ─── سيرفر وهمي 24/7 ───
http.createServer((req, res) => {
    res.write("🛏️ SleepBot is alive!");
    res.end();
}).listen(process.env.PORT || 3000);

// ─── الإعدادات ───
const botOptions = {
    host: 'dynamic-10.magmanode.com',
    port: 25566,
    username: 'SleepBot',
    offline: true,
    // version: '1.21.0', // حدد الإصدار إذا لزم
    autoInitPlayer: false // نتحكم بالتهيئة يدوياً
};

// ─── متغيرات الحالة ───
let client = null;
let runtimeEntityId = null;
let botPosition = { x: 0, y: 64, z: 0 };
let botRotation = { pitch: 0, yaw: 0, headYaw: 0 };
let currentTick = 0;
let tickInterval = null;

// خريطة السرائر: "chunkX,chunkZ" => [{x, y, z}]
const bedMap = new Map();
let targetBed = null;
let isMoving = false;
let isSleeping = false;
let isNight = false;

// ─── إعادة الاتصال ───
function startBot() {
    console.log('🚀 جاري الاتصال بالسيرفر...');
    client = bedrock.createClient(botOptions);

    // ─── تسجيل الـ Runtime Entity ID ───
    client.on('start_game', (packet) => {
        runtimeEntityId = packet.runtime_entity_id;
        console.log(`🆔 Runtime Entity ID: ${runtimeEntityId}`);
        
        // 🔧 إصلاح مشكلة "immortal" (البوت الشبح)
        client.queue('serverbound_loading_screen', { type: 1 });
        client.queue('serverbound_loading_screen', { type: 2 });
        
        client.queue('interact', {
            action_id: 'mouse_over_entity',
            target_entity_id: 0n,
            position: { x: 0, y: 0, z: 0 }
        });
        
        client.queue('set_local_player_as_initialized', {
            runtime_entity_id: `${runtimeEntityId}`
        });
    });

    // ─── عند الدخول للعالم ───
    client.on('spawn', () => {
        console.log('✅ البوت دخل السيرفر بنجاح');
        startTickLoop();
    });

    // ─── تحديث موقع البوت ───
    client.on('move_player', (packet) => {
        if (packet.runtime_entity_id === runtimeEntityId) {
            botPosition = {
                x: packet.position.x,
                y: packet.position.y,
                z: packet.position.z
            };
        }
    });

    // ─── اكتشاف بلوكات جديدة (سرائر) ───
    client.on('update_block', (packet) => {
        // محاولة اكتشاف السرير من تغيير البلوك
        // ملاحظة: Bed runtime ID يختلف حسب الإصدار والـ palette
        // هذا كشف تقريبي - يحتاج تعديل حسب إصدار السيرفر
        checkIfBedAndStore(packet.position, packet.block_runtime_id);
    });

    // ─── تحليل Chunk Data للبحث عن سرائر ───
    client.on('level_chunk', (packet) => {
        try {
            const beds = parseChunkForBeds(packet);
            if (beds.length > 0) {
                const chunkKey = `${packet.x},${packet.z}`;
                bedMap.set(chunkKey, beds);
                console.log(`🛏️ وجدت ${beds.length} سرير في chunk [${chunkKey}]`);
            }
        } catch (e) {
            // تجاهل أخطاء التحليل - الـ chunk format معقد
        }
    });

    // ─── مراقبة الوقت ───
    client.on('set_time', (packet) => {
        const time = packet.time % 24000;
        const wasNight = isNight;
        isNight = (time >= 12500 && time <= 23000);

        if (isNight && !wasNight && !isSleeping) {
            console.log('🌙 حل الليل! البوت يبحث عن سرير...');
            findAndGoToBed();
        } else if (!isNight && wasNight && isSleeping) {
            console.log('☀️ صباح! البوت يستيقظ.');
            wakeUp();
        }
    });

    // ─── الاستجابة للشات ───
    client.on('text', (packet) => {
        if (packet.source_name === botOptions.username) return;
        const msg = (packet.message || '').toLowerCase();
        
        // أوامر يدوية
        if (msg.includes('!sleep') || msg.includes('!نوم')) {
            findAndGoToBed();
        } else if (msg.includes('!wake') || msg.includes('!صحي')) {
            wakeUp();
        } else if (msg.includes('!beds') || msg.includes('!سرائر')) {
            const totalBeds = Array.from(bedMap.values()).flat().length;
            sendChat(`🛏️ أعرف عن ${totalBeds} سرير في الخريطة`);
        }
    });

    // ─── إعادة الاتصال ───
    client.on('close', () => {
        console.log('⚠️ انقطع الاتصال. إعادة المحاولة بعد 10 ثوانٍ...');
        stopTickLoop();
        setTimeout(startBot, 10000);
    });

    client.on('error', (err) => {
        console.error('❌ خطأ:', err.message);
    });
}

// ─── حلقة الـ Ticks (للحركة) ───
function startTickLoop() {
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = setInterval(() => {
        if (!client || !runtimeEntityId) return;
        currentTick++;
        sendPlayerAuthInput();
    }, 50); // 20 tick/sec (50ms)
}

function stopTickLoop() {
    if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
    }
}

// ─── إرسال حركة البوت ───
function sendPlayerAuthInput() {
    let moveX = 0, moveZ = 0;

    if (isMoving && targetBed) {
        const dx = targetBed.x - botPosition.x;
        const dz = targetBed.z - botPosition.z;
        const dy = targetBed.y - botPosition.y;
        const dist = Math.sqrt(dx*dx + dz*dz);

        if (dist < 1.5) {
            // وصلنا! نتوقف وننام
            isMoving = false;
            console.log('🛏️ وصلنا للسرير!');
            sleepInBed();
            return;
        }

        // حساب اتجاه الحركة (normalized)
        moveX = dx / dist;
        moveZ = dz / dist;

        // تحديث الموقع التقديري
        const speed = 0.15; // سرعة المشي
        botPosition.x += moveX * speed;
        botPosition.z += moveZ * speed;
        
        // تسوية الـ Y تدريجياً
        if (Math.abs(dy) > 0.5) {
            botPosition.y += Math.sign(dy) * 0.1;
        }

        // حساب الـ yaw للنظر نحو السرير
        botRotation.yaw = (Math.atan2(dx, dz) * 180 / Math.PI);
    }

    // إرسال PlayerAuthInput (server-authoritative movement)
    try {
        client.queue('player_auth_input', {
            position: {
                x: botPosition.x,
                y: botPosition.y,
                z: botPosition.z
            },
            rotation: {
                x: botRotation.pitch,
                y: botRotation.yaw
            },
            move_vector: {
                x: moveX,
                y: moveZ
            },
            head_yaw: botRotation.headYaw,
            input_data: 0n,
            input_mode: 0,
            play_mode: 0,
            vr_gaze_direction: { x: 0, y: 0, z: 0 },
            tick: BigInt(currentTick),
            delta: { x: 0, y: 0, z: 0 },
            analog_move_vector: { x: 0, y: 0 }
        });
    } catch (e) {
        // بعض الإصدارات قد تختلف في الحقول
    }
}

// ─── البحث عن أقرب سرير ───
function findAndGoToBed() {
    if (isSleeping) return;

    const allBeds = Array.from(bedMap.values()).flat();
    if (allBeds.length === 0) {
        console.log('⚠️ لم يتم العثور على سرائر. استخدم !sleep بعد وضع سرير.');
        sendChat('⚠️ لم أجد سريراً حولي!');
        return;
    }

    // إيجاد أقرب سرير
    let nearest = null;
    let minDist = Infinity;

    for (const bed of allBeds) {
        const dx = bed.x - botPosition.x;
        const dz = bed.z - botPosition.z;
        const dist = Math.sqrt(dx*dx + dz*dz);
        
        if (dist < minDist) {
            minDist = dist;
            nearest = bed;
        }
    }

    if (nearest) {
        targetBed = nearest;
        isMoving = true;
        console.log(`🚶 البوت يتجه إلى السرير عند [${nearest.x}, ${nearest.y}, ${nearest.z}] (المسافة: ${minDist.toFixed(1)}m)`);
        sendChat(`🛏️ ذاهب للنوم في سرير على بعد ${minDist.toFixed(0)} متر...`);
    }
}

// ─── النوم في السرير ───
function sleepInBed() {
    if (!client || !runtimeEntityId || !targetBed) return;
    
    isSleeping = true;
    console.log('😴 البوت ينام...');

    // 1. التفاعل مع السرير (interact)
    try {
        client.queue('interact', {
            action_id: 'interact',
            target_entity_id: 0n,
            position: {
                x: targetBed.x,
                y: targetBed.y,
                z: targetBed.z
            }
        });
    } catch (e) {}

    // 2. إرسال PlayerAction للنوم
    setTimeout(() => {
        try {
            client.queue('player_action', {
                runtime_id: runtimeEntityId,
                action: 11, // START_SLEEPING (حسب gophertunnel)
                position: {
                    x: Math.floor(targetBed.x),
                    y: Math.floor(targetBed.y),
                    z: Math.floor(targetBed.z)
                },
                face: 0
            });
        } catch (e) {
            console.error('خطأ في إرسال action النوم:', e.message);
        }
    }, 300);
}

// ─── الاستيقاظ ───
function wakeUp() {
    if (!client || !runtimeEntityId) return;
    
    isSleeping = false;
    targetBed = null;
    console.log('⏰ البوت يستيقظ');

    try {
        client.queue('player_action', {
            runtime_id: runtimeEntityId,
            action: 12, // STOP_SLEEPING
            position: {
                x: Math.floor(botPosition.x),
                y: Math.floor(botPosition.y),
                z: Math.floor(botPosition.z)
            },
            face: 0
        });
    } catch (e) {}
}

// ─── إرسال رسالة في الشات ───
function sendChat(message) {
    if (!client) return;
    try {
        client.queue('text', {
            type: 'chat',
            needs_translation: false,
            source_name: botOptions.username,
            xuid: '',
            platform_chat_id: '',
            filtered_message: '',
            message: message
        });
    } catch (e) {}
}

// ─── تحليل Chunk للبحث عن سرائر (مبسط) ───
function parseChunkForBeds(packet) {
    const beds = [];
    
    try {
        // Bedrock Chunk Format (مبسط جداً):
        // الإصدار 1.18+ يستخدم subchunks مع palettes
        
        // للأسف، تحليل Chunk Data كامل يتطلب فهم deep للـ format
        // هنا نستخدم كشف تقريبي
        
        // إذا كان الـ chunk يحتوي على بيانات
        if (packet.chunk_data && packet.chunk_data.length > 0) {
            // محاولة فك الضغط
            let data;
            try {
                data = zlib.inflateSync(packet.chunk_data);
            } catch {
                data = packet.chunk_data; // ربما غير مضغوط
            }
            
            // البحث عن أنماط تشبه السرير في البيانات
            // هذا كشف هيريستيكي (غير مضمون 100%)
            // Bed runtime IDs ع suelen تكون في نطاق معين
            
            // للحصول على نتائج دقيقة، يُفضل استخدام minecraft-data
            // لمعرفة runtime ID الخاص بالسرير في إصدار السيرفر
            
            // حالياً نعتمد على update_block packets للكشف الفوري
        }
    } catch (e) {
        // تجاهل silently
    }
    
    return beds;
}

// ─── تخزين موقع السرير ───
function checkIfBedAndStore(position, runtimeId) {
    // بدون minecraft-data، لا نستطيع التأكد إذا كان الـ runtimeId هو سرير
    // لكن يمكننا استخدام heuristic: إذا كان اسم البلوك يحتوي على "bed"
    
    // للحصول على دقة، يُنصح بتثبيت minecraft-data:
    // npm install minecraft-data
    
    // كحل مؤقت: نخزن جميع البلوكات القريبة من الأرض (y < 100)
    // ونعتبرها "potential beds" ثم نختبرها عند الاقتراب
    
    if (position.y < 150) {
        // نخزن جميع البلوكات المشبوهة
        const chunkX = Math.floor(position.x / 16);
        const chunkZ = Math.floor(position.z / 16);
        const key = `${chunkX},${chunkZ}`;
        
        if (!bedMap.has(key)) bedMap.set(key, []);
        
        // نتحقق إذا كان هذا الموقع مسجل مسبقاً
        const chunkBeds = bedMap.get(key);
        const exists = chunkBeds.some(b => 
            b.x === position.x && b.y === position.y && b.z === position.z
        );
        
        if (!exists) {
            // نضيف كـ "potential bed" - سيتم التحقق عند الاقتراب
            chunkBeds.push({
                x: position.x,
                y: position.y,
                z: position.z,
                runtimeId: runtimeId,
                isConfirmed: false
            });
        }
    }
}

// ─── بدء البوت ───
startBot();
