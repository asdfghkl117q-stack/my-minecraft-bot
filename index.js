const bedrock = require('bedrock-protocol');

// إعدادات الاتصال بالسيرفر
const botOptions = {
    host: 'gold.magmanode.com',
    port: 26354,
    username: 'ServerKeeper_Bot',
    offline: true,
    skipPing: true // اقتحام سريع للسيرفر وتخطي الـ Timeout
};

const bot = bedrock.createClient(botOptions);

bot.on('spawn', () => {
    console.log(`✅ ${botOptions.username} جاهز ومحصن! تم تفعيل نظام كلمات السر والمتجر.`);
});

bot.on('text', (packet) => {
    try {
        if (packet.source_name === botOptions.username) return;

        const message = packet.message.toLowerCase().trim();
        const player = packet.source_name;

        // وظيفة إرسال الأوامر الآمنة الموحدة لمنع الكراش
        const runCmd = (cmdText) => {
            bot.write('command_request', {
                command: cmdText,
                internal: false, version: '1',
                origin: { type: 'player', uuid: '00000000-0000-0000-0000-000000000000', request_id: '0', player_entity_id: [0, 0] }
            });
        };

        // وظيفة إرسال رسائل الشات العادية
        const sendChat = (textMsg) => {
            bot.write('text', {
                type: 'chat', needs_translation: false, source_name: botOptions.username,
                message: textMsg, xuid: '', platform_chat_id: ''
            });
        };

        // 1. قائمة المساعدة وعرض الكلمات السرية
        if (message === 'الاسرار' || message === 'كلمات السر' || message === '!cheats') {
            sendChat(`=== 👑 قائمة كلمات السر الخارقة ===\n` +
                     `• !سر_القوة (وضع الخلود)\n` +
                     `• !سر_الطيران (طور الكرييتف)\n` +
                     `• !سر_النجاة (طور السرفايفل)\n` +
                     `• !سر_الخبرة (ليفل XP سريع)\n` +
                     `• !سر_الوحوش (قتل الوحوش القريبة)\n` +
                     `• !سر_الفلوس (شحن عملات المتجر)\n` +
                     `• !سر_الاختفاء (تأثير الاختفاء)\n` +
                     `• !سر_العتاد (أدوات الحرب)\n` +
                     `• !day (تحويل الوقت لنهار)`);
            return;
        }

        // 2. قائمة المتجر التقليدية
        if (message === '!shop' || message === 'المتجر') {
            sendChat(`=== 🛒 متجر السيرفر الشامل ===\n` +
                     `• اكتب (!شراء [اسم_الغرض] [العدد]) للشراء\n` +
                     `• اكتب (!بيع [اسم_الغرض] [العدد]) للبيع\n` +
                     `• اكتب (كلمات السر) لعرض الأوامر الخارقة!`);
            return;
        }

        // --- تنفيذ كلمات السر (Cheats) ---

        // تحويل الوقت لنهار
        if (message === '!day') {
            runCmd(`time set day`);
            sendChat(`☀️ تم تحويل الوقت إلى النهار يا ${player}!`);
        }

        // كلمة سر القوة والخلود
        if (message === '!سر_القوة' || message === '!god') {
            runCmd(`effect ${player} regeneration 99999 5 true`);
            runCmd(`effect ${player} resistance 99999 5 true`);
            runCmd(`effect ${player} absorption 99999 4 true`);
            sendChat(`🛡️ تم تفعيل وضع الخلود والقوة المطلقة للاعب: ${player}`);
        }

        // كلمة سر الطيران (Creative)
        if (message === '!سر_الطيران' || message === '!fly') {
            runCmd(`gamemode creative ${player}`);
            sendChat(`🚀 تم تحويل طور اللاعب ${player} إلى الإبداع (Creative)! طِر في السماء!`);
        }

        // كلمة سر النجاة (Survival)
        if (message === '!سر_النجاة' || message === '!survival') {
            runCmd(`gamemode survival ${player}`);
            sendChat(`⚔️ تم إعادتك لطور البقاء يا ${player}. بالتوفيق!`);
        }

        // كلمة سر الخبرة (XP)
        if (message === '!سر_الخبرة' || message === '!xp') {
            runCmd(`xp 1000l ${player}`);
            sendChat(`✨ مبروك! تم منح ${player} ليفل خارق من نقاط الخبرة.`);
        }

        // كلمة سر التخلص من الوحوش
        if (message === '!سر_الوحوش' || message === '!killall') {
            runCmd(`kill @e[type=!player,type=!item,type=!npc]`);
            sendChat(`⚡ صعقة سحرية! تم تطهير المنطقة وإبادة جميع الوحوش بنجاح.`);
        }

        // كلمة سر شحن الفلوس (العملة)
        if (message === '!سر_الفلوس' || message === '!money') {
            runCmd(`give ${player} paper 64 0 {display:{Name:'{"text":"الورقة الخضراء (عملة)"}'}}`);
            sendChat(`💰 هكر الثروة! استلم 64 ورقة نقدية مجانية في حقيبتك يا ${player}.`);
        }

        // كلمة سر الاختفاء
        if (message === '!سر_الاختفاء' || message === '!invisible') {
            runCmd(`effect ${player} invisibility 99999 1 true`);
            sendChat(`👻 أصبحت شبحاً مخفياً الآن يا ${player}! لا أحد يمكنه رؤيتك.`);
        }

        // كلمة سر العتاد السريع
        if (message === '!سر_العتاد' || message === '!kit') {
            runCmd(`give ${player} diamond_sword 1`);
            runCmd(`give ${player} diamond_pickaxe 1`);
            runCmd(`give ${player} cooked_beef 32`);
            sendChat(`📦 تم تسليم حقيبة العتاد الحربي بنجاح للاعب ${player}.`);
        }

        // --- نظام التجارة (المتجر) ---

        // نظام الشراء (!شراء diamond 64)
        if (message.startsWith('!شراء ')) {
            const parts = message.split(' ');
            const itemName = parts[1];
            const amount = parseInt(parts[2]) || 1;
            if (!itemName) return;

            sendChat(`⏳ جاري معالجة الشراء للاعب ${player}...`);
            runCmd(`give ${player} ${itemName} ${amount}`);
            runCmd(`clear ${player} paper 0 ${amount}`);
        }

        // نظام البيع (!بيع cobblestone 64)
        if (message.startsWith('!بيع ')) {
            const parts = message.split(' ');
            const itemName = parts[1];
            const amount = parseInt(parts[2]) || 1;
            if (!itemName) return;

            runCmd(`clear ${player} ${itemName} 0 ${amount}`);
            runCmd(`give ${player} paper ${amount} 0 {display:{Name:'{"text":"الورقة الخضراء (عملة)"}'}}`);
            sendChat(`💰 تمت العملية! بعت ${amount} من ${itemName} واستلمت عملاتك بنجاح.`);
        }

    } catch (err) {
        console.log("⚠️ تم صيد خطأ شات عابر، البوت مستقر ولن يخرج: " + err.message);
    }
});

// حماية الأخطاء العامة
bot.on('error', (err) => {
    console.log(`❌ خطأ عام في البوت: ${err.message}`);
});

// إعادة اتصال ذكي تلقائي عند الحاجة
bot.on('disconnect', (packet) => {
    console.log(`⚠️ انقطع الاتصال بسبب: ${packet.reason}. إعادة تشغيل آمنة بعد 10 ثوانٍ...`);
    setTimeout(() => { process.exit(1); }, 10000);
});
