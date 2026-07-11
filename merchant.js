const bedrock = require('bedrock-protocol');

// إعدادات الاتصال بالسيرفر
const botOptions = {
    host: 'gold.magmanode.com',
    port: 26354,
    username: 'ServerKeeper_Bot',
    offline: true
};

const bot = bedrock.createClient(botOptions);

// نظام تسعير المجموعات التلقائي (بالعملة المخصصة)
const PRICING = {
    common: { buyPrice: 1, sellReward: 1, name: "البلوكات العادية (خشب، حجر، رمل، طين...)" },
    rare: { buyPrice: 5, sellReward: 2, name: "الموارد النادرة (حديد، ذهب، ريدستون، زمرد...)" },
    epic: { buyPrice: 20, sellReward: 8, name: "الموارد الثمينة (دايموند، نذروايت، توتم...)" },
    op: { buyPrice: 50, sellReward: 20, name: "الأدوات المطورة والخارقة OP" }
};

bot.on('spawn', () => {
    console.log(`${botOptions.username} جاهز الآن لبيع وشراء كل شيء في اللعبة!`);
});

bot.on('text', (packet) => {
    if (packet.source_name === botOptions.username) return;

    const message = packet.message.toLowerCase().trim();
    const player = packet.source_name;

    // 1. استعراض قوائم الأسعار لجميع الأشياء
    if (message === '!shop' || message === 'المتجر') {
        bot.queue('text', {
            type: 'chat', needs_translation: false, source_name: botOptions.username,
            message: `=== 🛒 متجر ماين كرافت الشامل لتداول كل شيء ===\n` +
                     `• اكتب (!شراء [اسم_الغرض] [العدد]) للشراء\n` +
                     `• اكتب (!بيع [اسم_الغرض] [العدد]) للبيع\n` +
                     `💸 قائمة الأسعار العامة:\n` +
                     `1. عادية (خشب/حجر): الشراء بـ 1 | البيع بـ 1\n` +
                     `2. نادرة (حديد/ذهب): الشراء بـ 5 | البيع بـ 2\n` +
                     `3. ثمينة (دايموند/نذروايت): الشراء بـ 20 | البيع بـ 8\n` +
                     `4. خارقة (أدوات OP): الشراء بـ 50`
        });
    }

    // 2. أمر الشراء الذكي لـ أي شيء في اللعبة (!شراء diamond 64) أو (!شراء oak_log 10)
    if (message.startsWith('!شراء ')) {
        const parts = message.split(' ');
        const itemName = parts[1]; // اسم الغرض بالإنجليزية كما في اللعبة
        const amount = parseInt(parts[2]) || 1; // العدد

        if (!itemName) return;

        bot.queue('text', {
            type: 'chat', needs_translation: false, source_name: botOptions.username,
            message: `⏳ جاري معالجة شراء ${amount} من (${itemName}) للاعب ${player}...`
        });

        // أمر كونسول لإعطاء اللاعب أي غرض يكتب اسمه فوراً
        bot.queue('command_request', {
            command: `give ${player} ${itemName} ${amount}`,
            internal: false, version: 1
        });

        // سحب العملة الخضراء المخصصة من اللاعب كمقابل
        bot.queue('command_request', {
            command: `clear ${player} paper 0 ${amount}`, // يسحب أوراق بقدر العدد والتصنيف
            internal: false, version: 1
        });
    }

    // 3. أمر البيع الذكي لـ أي شيء في اللعبة (!بيع cobblestone 64)
    if (message.startsWith('!بيع ')) {
        const parts = message.split(' ');
        const itemName = parts[1];
        const amount = parseInt(parts[2]) || 1;

        if (!itemName) return;

        // سحب الغرض من حقيبة اللاعب أولاً للتأكد أنه يملكه
        bot.queue('command_request', {
            command: `clear ${player} ${itemName} 0 ${amount}`,
            internal: false, version: 1
        });

        // إعطائه العملة المخصصة (الورقة الخضراء) كمكافأة فورية على البيع
        bot.queue('command_request', {
            command: `give ${player} paper ${amount} 0 {display:{Name:'{"text":"الورقة الخضراء (عملة)"}'}}`,
            internal: false, version: 1
        });

        bot.queue('text', {
            type: 'chat', needs_translation: false, source_name: botOptions.username,
            message: `💰 تمت العملية! بعت ${amount} من ${itemName} واستلمت عملاتك.`
        });
    }
});

// إعادة الاتصال التلقائي
bot.on('disconnect', (packet) => {
    setTimeout(() => { process.exit(1); }, 10000);
});
