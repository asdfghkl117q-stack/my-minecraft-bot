const bedrock = require('bedrock-protocol');

// إعدادات الاتصال بالسيرفر
const botOptions = {
    host: 'gold.magmanode.com',
    port: 26354,
    username: 'ServerKeeper_Bot',
    offline: true
};

const bot = bedrock.createClient(botOptions);

bot.on('spawn', () => {
    console.log(`${botOptions.username} جاهز الآن لبيع وشراء كل شيء في اللعبة!`);
});

bot.on('text', (packet) => {
    // تجنب رد البوت على نفسه لكي لا يدخل في حلقة لا نهائية
    if (packet.source_name === botOptions.username) return;

    const message = packet.message.toLowerCase().trim();
    const player = packet.source_name;

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

        // أمر كونسول لإعطاء اللاعب الغرض
        bot.write('command_request', {
            command: `give ${player} ${itemName} ${amount}`,
            internal: false, version: 1,
            origin: { type: 0, uuid: '', request_id: '' }
        });

        // سحب العملة المخصصة (الورقة) من اللاعب كمقابل
        bot.write('command_request', {
            command: `clear ${player} paper 0 ${amount}`,
            internal: false, version: 1,
            origin: { type: 0, uuid: '', request_id: '' }
        });
    }

    // 3. أمر البيع الذكي (!بيع cobblestone 64)
    if (message.startsWith('!بيع ')) {
        const parts = message.split(' ');
        const itemName = parts[1];
        const amount = parseInt(parts[2]) || 1;

        if (!itemName) return;

        // سحب الغرض من حقيبة اللاعب
        bot.write('command_request', {
            command: `clear ${player} ${itemName} 0 ${amount}`,
            internal: false, version: 1,
            origin: { type: 0, uuid: '', request_id: '' }
        });

        // إعطائه العملة المخصصة (الورقة الخضراء)
        bot.write('command_request', {
            command: `give ${player} paper ${amount} 0 {display:{Name:'{"text":"الورقة الخضراء (عملة)"}'}}`,
            internal: false, version: 1,
            origin: { type: 0, uuid: '', request_id: '' }
        });

        bot.write('text', {
            type: 'chat', needs_translation: false, source_name: botOptions.username,
            message: `💰 تمت العملية يا ${player}! بعت ${amount} من ${itemName} واستلمت عملاتك.`,
            xuid: '', platform_chat_id: ''
        });
    }
});

// إعادة الاتصال التلقائي في حال انقطع الاتصال
bot.on('disconnect', (packet) => {
    setTimeout(() => { process.exit(1); }, 10000);
});
