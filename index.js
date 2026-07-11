const bedrock = require('bedrock-protocol');
const http = require('http');

// ─── سيرفر وهمي 24/7 ───
http.createServer((req, res) => {
    res.write("Bot is alive!");
    res.end();
}).listen(process.env.PORT || 3000);

// ─── إعدادات البوت ───
const botOptions = {
    host: 'dynamic-10.magmanode.com',
    port: 25566,
    username: 'SleepBot',
    offline: true,
    // ⚠️ حدد الإصدار إذا عرفته، أو اتركه يتعرف تلقائياً
    // version: '1.21.30',
    connectTimeout: 15000,      // 15 ثانية بدلاً من 9
    autoInitPlayer: true,       // مهم جداً!
    skipPing: false             // لا تتخطى Ping
};

// ─── الحالة ───
let client = null;
let runtimeEntityId = null;
let botPosition = { x: 0, y: 64, z: 0 };
let botRotation = { pitch: 0, yaw: 0, headYaw: 0 };
let currentTick = 0;
let tickInterval = null;

// خريطة السرائر
const bedMap = new Map();
let targetBed = null;
let isMoving = false;
let isSleeping = false;
let isNight = false;
let connectionActive = false;

// ─── بدء الاتصال ───
function startBot() {
    console.log('🚀 جاري الاتصال...');
    connectionActive = false;

    try {
        client = bedrock.createClient(botOptions);
    } catch (e) {
        console.error('❌ فشل إنشاء العميل:', e.message);
        setTimeout(startBot, 10000);
        return;
    }

    // ─── عند الاتصال الناجح ───
    client.on('connect', () => {
        console.log('🔗 اتصال Raknet ناجح');
    });

    // ─── تسجيل Runtime Entity ID ───
    client.on('start_game', (packet) => {
        runtimeEntityId = packet.runtime_entity_id;
        console.log(`🆔 Runtime Entity ID: ${runtimeEntityId}`);
        
        // إصلاح مشكلة "البوت الشبح" - إرسال حزم التهيئة
        try {
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
            
            console.log('✅ تم إرسال حزم التهيئة');
        } catch (e) {
            console.error('خطأ في التهيئة:', e.message);
        }
    });

    // ─── عند الدخول للعالم ───
    client.on('spawn', () => {
        console.log('✅ البوت دخل السيرفر!');
        connectionActive = true;
        startTickLoop(); // 🔥 ابدأ إرسال player_auth_input فوراً
    });

    // ─── تحديث الموقع ───
    client.on('move_player', (packet) => {
        if (packet.runtime_entity_id === runtimeEntityId) {
            botPosition = {
                x: packet.position.x,
                y: packet.position.y,
                z: packet.position.z
            };
        }
    });

    // ─── اكتشاف بلوكات (سرائر محتملة) ───
    client.on('update_block', (packet) => {
        // نخزن جميع البلوكات التي تتغير كـ "potential beds"
        const pos = packet.position;
        const chunkX = Math.floor(pos.x / 16);
        const chunkZ = Math.floor(pos.z / 16);
        const key = `${chunkX},${chunkZ}`;
        
        if (!bedMap.has(key)) bedMap.set(key, []);
        const beds = bedMap.get(key);
        
        // تجنب التكرار
        const exists = beds.some(b => b.x === pos.x && b.y === pos.y && b.z === pos.z);
        if (!exists) {
            beds.push({ x: pos.x, y: pos.y, z: pos.z });
            console.log(`📦 بلوك جديد عند [${pos.x}, ${pos.y}, ${pos.z}]`);
        }
    });

    // ─── مراقبة الوقت ───
    client.on('set_time', (packet) => {
        const time = packet.time % 24000;
        const wasNight = isNight;
        isNight = (time >= 12500 && time <= 23000);

        if (isNight && !wasNight && !isSleeping && connectionActive) {
            console.log('🌙 حل الليل! البوت يبحث عن سرير...');
            findAndGoToBed();
        } else if (!isNight && wasNight && isSleeping) {
            console.log('☀️ صباح! البوت يستيقظ.');
            wakeUp();
        }
    });

    // ─── الاستجابة للشات ───
    client.on('text', (packet) => {
        if (!packet.source_name || packet.source_name === botOptions.username) return;
        const msg = (packet.message || '').toLowerCase();
        
        if (msg.includes('!sleep') || msg.includes('!نوم')) {
            findAndGoToBed();
        } else if (msg.includes('!wake') || msg.includes('!صحي')) {
            wakeUp();
        } else if (msg.includes('!beds') || msg.includes('!سرائر')) {
            const total = Array.from(bedMap.values()).flat().length;
            sendChat(`🛏️ أعرف عن ${total} بلوك محتمل`);
        }
    });

    // ─── إعادة الاتصال ───
    client.on('close', (reason) => {
        console.log('⚠️ انقطع الاتصال:', reason || 'بدون سبب');
        connectionActive = false;
        stopTickLoop();
        isSleeping = false;
        isMoving = false;
        
        // إعادة المحاولة بعد 10 ثوانٍ
        setTimeout(startBot, 10000);
    });

    client.on('error', (err) => {
        console.error('❌ خطأ:', err.message);
        // لا تُغلق الاتصال هنا، دع 'close' يتولى الأمر
    });

    client.on('kick', (reason) => {
        console.log('🚫 طُرد البوت:', reason);
    });
}

// ─── 🔥 حلقة الـ Ticks (مهمة جداً!) ───
function startTickLoop() {
    if (tickInterval) clearInterval(tickInterval);
    
    tickInterval = setInterval(() => {
        if (!client || !connectionActive || !runtimeEntityId) return;
        
        currentTick++;
        sendPlayerAuthInput();
        
        // إرسال tick_sync كل 20 tick (1 ثانية) للحفاظ على الاتصال
        if (currentTick % 20 === 0) {
            try {
                client.queue('tick_sync', {
                    request_tick: BigInt(currentTick),
                    response_tick: 0n
                });
            } catch (e) {}
        }
    }, 50); // 20 tick/sec
}

function stopTickLoop() {
    if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
    }
}

// ─── إرسال حركة البوت (ضروري للبقاء متصلاً) ───
function sendPlayerAuthInput() {
    let moveX = 0, moveZ = 0;

    if (isMoving && targetBed) {
        const dx = targetBed.x - botPosition.x;
        const dz = targetBed.z - botPosition.z;
        const dy = targetBed.y - botPosition.y;
        const dist = Math.sqrt(dx*dx + dz*dz);

        if (dist < 1.5) {
            isMoving = false;
            console.log('🛏️ وصلنا للسرير!');
            sleepInBed();
            return;
        }

        moveX = dx / dist;
        moveZ = dz / dist;

        const speed = 0.15;
        botPosition.x += moveX * speed;
        botPosition.z += moveZ * speed;
        
        if (Math.abs(dy) > 0.5) {
            botPosition.y += Math.sign(dy) * 0.1;
        }

        botRotation.yaw = (Math.atan2(dx, dz) * 180 / Math.PI);
    }

    // 🔥 إرسال PlayerAuthInput كل 50ms (إلزامي!)
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
        // تجاهل
    }
}

// ─── البحث عن أقرب سرير ───
function findAndGoToBed() {
    if (isSleeping || !connectionActive) return;

    const allBeds = Array.from(bedMap.values()).flat();
    if (allBeds.length === 0) {
        console.log('⚠️ لم أجد سرائر. ضع سريراً قرب البوت واكتب !sleep');
        sendChat('⚠️ لم أجد سريراً! ضع واحداً قربي.');
        return;
    }

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
        console.log(`🚶 ذاهب إلى [${nearest.x}, ${nearest.y}, ${nearest.z}] (${minDist.toFixed(1)}m)`);
        sendChat(`🛏️ ذاهب للنوم...`);
    }
}

// ─── النوم في السرير ───
function sleepInBed() {
    if (!client || !runtimeEntityId || !targetBed || !connectionActive) return;
    
    isSleeping = true;
    console.log('😴 ينام...');

    // التفاعل مع السرير
    setTimeout(() => {
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

        // إرسال action النوم
        setTimeout(() => {
            try {
                client.queue('player_action', {
                    runtime_id: runtimeEntityId,
                    action: 11, // START_SLEEPING
                    position: {
                        x: Math.floor(targetBed.x),
                        y: Math.floor(targetBed.y),
                        z: Math.floor(targetBed.z)
                    },
                    face: 0
                });
            } catch (e) {}
        }, 300);
    }, 200);
}

// ─── الاستيقاظ ───
function wakeUp() {
    if (!client || !runtimeEntityId || !connectionActive) return;
    
    isSleeping = false;
    targetBed = null;
    console.log('⏰ يستيقظ');

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

// ─── إرسال شات ───
function sendChat(message) {
    if (!client || !connectionActive) return;
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

// ─── بدء البوت ───
startBot();
