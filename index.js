const bedrock = require('bedrock-protocol');

const botOptions = {
    host: 'gold.magmanode.com',
    port: 26354,
    username: 'ServerKeeper_Bot',
    offline: true,
    skipPing: true
};

const bot = bedrock.createClient(botOptions);

bot.on('spawn', () => {
    console.log(`✅ البوت دخل السيرفر ويعمل الآن بثبات.`);
});

bot.on('text', (packet) => {
    // نضع كل منطق الرد داخل try-catch لمنع البوت من الخروج عند حدوث أي خطأ
    try {
        if (packet.source_name === botOptions.username) return;

        const message = packet.message.toLowerCase().trim();
        const player = packet.source_name;

        // 1. أمر إظهار المتجر
        if (message === '!shop' || message === 'المتجر') {
            bot.write('text', {
                type: 'chat', needs_translation: false, source_name: botOptions.username,
                message: `🛒 متجر السيرفر:\n!شراء [الشيء] [العدد]\n!بيع [الشيء] [العدد]`,
                xuid: '', platform_chat_id: ''
            });
        }

        // 2. أمر تخطي الليل (تحويل الوقت لنهار) - بديل النوم
        if (message === '!day') {
             bot.write('command_request', {
                command: `time set day`,
                internal: false, version: '1',
                origin: { type: 'player', uuid: '00000000-0000-0000-0000-000000000000', request_id: '0' }
            });
        }

        // 3. أمر الشراء
        if (message.startsWith('!شراء ')) {
            const parts = message.split(' ');
            const itemName = parts[1];
            const amount = parseInt(parts[2]) || 1;
            if (!itemName) return;

            bot.write('command_request', {
                command: `give ${player} ${itemName} ${amount}`,
                internal: false, version: '1',
                origin: { type: 'player', uuid: '00000000-0000-0000-0000-000000000000', request_id: '0' }
            });
            bot.write('command_request', {
                command: `clear ${player} paper 0 ${amount}`,
                internal: false, version: '1',
                origin: { type: 'player', uuid: '00000000-0000-0000-0000-000000000000', request_id: '0' }
            });
        }

        // 4. أمر البيع
        if (message.startsWith('!بيع ')) {
            const parts = message.split(' ');
            const itemName = parts[1];
            const amount = parseInt(parts[2]) || 1;
            if (!itemName) return;

            bot.write('command_request', {
                command: `clear ${player} ${itemName} 0 ${amount}`,
                internal: false, version: '1',
                origin: { type: 'player', uuid: '00000000-0000-0000-0000-000000000000', request_id: '0' }
            });
            bot.write('command_request', {
                command: `give ${player} paper ${amount}`,
                internal: false, version: '1',
                origin: { type: 'player', uuid: '00000000-0000-0000-0000-000000000000', request_id: '0' }
            });
        }
    } catch (err) {
        console.log("⚠️ خطأ في معالجة الرسالة، لكن البوت مستمر ولن يخرج: " + err.message);
    }
});

bot.on('error', (err) => {
    console.log(`❌ خطأ عام: ${err.message}`);
});

bot.on('disconnect', (packet) => {
    console.log(`⚠️ انقطع الاتصال. إعادة تشغيل في 10 ثوانٍ...`);
    setTimeout(() => { process.exit(1); }, 10000);
});

        // إعطائه العملة المخصصة (الورقة الخضراء)
        bot.write('command_request', {
            command: `give ${player} paper ${amount} 0 {display:{Name:'{"text":"الورقة الخضراء (عملة)"}'}}`,
            internal: false, 
            version: '1', 
            origin: { 
                type: 'player', 
                uuid: '00000000-0000-0000-0000-000000000000', 
                request_id: '0',
                player_entity_id: [0, 0]
            }
        });

        bot.write('text', {
            type: 'chat', needs_translation: false, source_name: botOptions.username,
            message: `💰 تمت العملية يا ${player}! بعت ${amount} من ${itemName} واستلمت عملاتك.`,
            xuid: '', platform_chat_id: ''
        });
    }
});

// نظام حماية وصيد الأخطاء البرمجية من الكراش
bot.on('error', (err) => {
    console.log(`❌ حدث خطأ في البوت: ${err.message}`);
});

// إعادة الاتصال التلقائي الذكي عند الفصل
bot.on('disconnect', (packet) => {
    console.log(`⚠️ انقطع الاتصال بسبب: ${packet.reason}. جاري إعادة التشغيل التلقائي...`);
    setTimeout(() => { process.exit(1); }, 10000);
});
