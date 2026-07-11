const bedrock = require('bedrock-protocol');

// إعدادات الاتصال بالسيرفر
const botOptions = {
    host: 'gold.magmanode.com',
    port: 26354,
    username: 'ServerKeeper_Bot',
    offline: true,
    skipPing: true // تخطي الفحص للدخول المباشر السريع
};

const bot = bedrock.createClient(botOptions);

bot.on('spawn', () => {
    console.log(`✅ ${botOptions.username} دخل السيرفر ورسبن بنجاح!`);
    
    // مؤقت أمان ننتظر 5 ثوانٍ قبل تفعيل أمر النوم
    setTimeout(() => {
        console.log("⚙️ جاري تفعيل قانون النوم التلقائي في السيرفر...");
        try {
            bot.write('command_request', {
                command: `gamerule playersSleepingPercentage 0`,
                internal: false, 
                version: '1', 
                origin: { type: 'player', uuid: '00000000-0000-0000-0000-000000000000', request_id: '0' }
            });
        } catch (e) {
            console.log("⚠️ فشل إرسال أمر النوم المبدئي: " + e.message);
        }
    }, 5000);
});

bot.on('text', (packet) => {
    if (packet.source_name === botOptions.username) return;

    const message = packet.message.toLowerCase().trim();
    const player = packet.source_name;

    // 💤 ميزة تخطي الليل الذكية عبر الشات
    if (message === 'نام' || message === '!sleep' || message === 'تخطي') {
        bot.write('command_request', {
            command: `time set day`,
            internal: false, 
            version: '1', 
            origin: { type: 'player', uuid: '00000000-0000-0000-0000-000000000000', request_id: '0' }
        });

        bot.write('text', {
            type: 'chat', needs_translation: false, source_name: botOptions.username,
            message: `☀️ أبشر يا ${player}! قمت بتخطي الليل وتحويل الوقت إلى النهار.`,
            xuid: '', platform_chat_id: ''
        });
        return;
    }

    // 1. استعراض قوائم الأسعار عند كتابة (المتجر) أو (!shop)
    if (message === '!shop' || message === 'المتجر') {
        bot.write('text', {
            type: 'chat', needs_translation: false, source_name: botOptions.username,
            message: `=== 🛒 متجر ماين كرافت الشامل لتداول كل شيء ===\n` +
                     `• اكتب (!شراء [اسم_الغرض] [العدد]) للشراء\n` +
                     `• اكتب (!بيع [اسم_الغرض] [العدد]) للبيع\n` +
                     `💸 قائمة الأسعار العامة:\n` +
                     `1. عادية (خشب/حجر): الشراء بـ 1 | البيع بـ 1\n` +
                     `2. نادرة (حديد/ذهب): الشراء بـ 5 | البيع بـ 2\n` +
                     `3. ثمينة (دايموند/نذروايت): الشراء بـ 20 | البيع بـ 8\n` +
                     `4. خارقة (أدوات OP): الشراء بـ 50`,
            xuid: '', platform_chat_id: ''
        });
    }

    // 2. أمر الشراء الذكي (!شراء diamond 64)
    if (message.startsWith('!شراء ')) {
        const parts = message.split(' ');
        const itemName = parts[1]; 
        const amount = parseInt(parts[2]) || 1; 

        if (!itemName) return;

        bot.write('text', {
            type: 'chat', needs_translation: false, source_name: botOptions.username,
            message: `⏳ جاري معالجة شراء ${amount} من (${itemName}) للاعب ${player}...`,
            xuid: '', platform_chat_id: ''
        });

        bot.write('command_request', {
            command: `give ${player} ${itemName} ${amount}`,
            internal: false, 
            version: '1', 
            origin: { type: 'player', uuid: '00000000-0000-0000-0000-000000000000', request_id: '0' }
        });

        bot.write('command_request', {
            command: `clear ${player} paper 0 ${amount}`,
            internal: false, 
            version: '1', 
            origin: { type: 'player', uuid: '00000000-0000-0000-0000-000000000000', request_id: '0' }
        });
    }

    // 3. أمر البيع الذكي (!بيع cobblestone 64)
    if (message.startsWith('!بيع ')) {
        const parts = message.split(' ');
        const itemName = parts[1];
        const amount = parseInt(parts[2]) || 1;

        if (!itemName) return;

        bot.write('command_request', {
            command: `clear ${player} ${itemName} 0 ${amount}`,
            internal: false, 
            version: '1', 
            origin: { type: 'player', uuid: '00000000-0000-0000-0000-000000000000', request_id: '0' }
        });

        bot.write('command_request', {
            command: `give ${player} paper ${amount} 0 {display:{Name:'{"text":"الورقة الخضراء (عملة)"}'}}`,
            internal: false, 
            version: '1', 
            origin: { type: 'player', uuid: '00000000-0000-0000-0000-000000000000', request_id: '0' }
        });

        bot.write('text', {
            type: 'chat', needs_translation: false, source_name: botOptions.username,
            message: `💰 تمت العملية يا ${player}! بعت ${amount} من ${itemName} واستلمت عملاتك.`,
            xuid: '', platform_chat_id: ''
        });
    }
});

// صيد الأخطاء البرمجية وطباعتها لحمايته
bot.on('error', (err) => {
    console.log(`❌ حدث خطأ في البوت: ${err.message}`);
});

// إعادة الاتصال التلقائي
bot.on('disconnect', (packet) => {
    console.log(`⚠️ انقطع الاتصال بسبب: ${packet.reason}. إعادة تشغيل...`);
    setTimeout(() => { process.exit(1); }, 10000);
});
