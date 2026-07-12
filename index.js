const bedrock = require('bedrock-protocol'); 
const http = require('http'); // مكتبة مدمجة لإنشاء سيرفر ويب وهمي

// سيرفر وهمي لإقناع منصة الاستضافة بأن البوت عبارة عن موقع ويب ليظل يعمل 24 ساعة
http.createServer((req, res) => {
    res.write("Bot is alive and running!");
    res.end();
}).listen(process.env.PORT || 3000);

// إعدادات البوت الصحيحة والمعدلة لسيرفرك الحالي
const botOptions = {
    host: 'gold.magmanode.com',   // سيرفرك الحالي
    port: 26354,                  // المنفذ الحالي
    username: 'ServerKeeper_Bot', 
    offline: true,
    skipPing: true                // تخطي الفحص للدخول المباشر السريع ومنع التايم أوت
};

function startBot() {
    console.log('جاري محاولة اتصال البوت بالسيرفر الآن...'); 
    const client = bedrock.createClient(botOptions); 

    client.on('spawn', () => {
        console.log(`✅ بنجاح! البوت [${botOptions.username}] متصل الآن داخل السيرفر.`); 
    });

    client.on('text', (packet) => {
        try {
            if (packet.source_name === botOptions.username) return;

            const message = packet.message.toLowerCase().trim();
            const player = packet.source_name;

            // دالة تشغيل الأوامر بأمان داخل كونسول السيرفر
            const runCmd = (cmdText) => {
                client.write('command_request', {
                    command: cmdText,
                    internal: false,
                    version: 1,
                    origin: { type: 'virtual', uuid: '00000000-0000-0000-0000-000000000000', request_id: '1' }
                });
            };

            // دالة إرسال الشات الآمنة (مفككة سطر سطر وخالية من الإيموجي منعا للطرد)
            const sendChat = (textMsg) => {
                const lines = textMsg.split('\n');
                lines.forEach((line) => {
                    if (line.trim().length > 0) {
                        client.write('text', {
                            type: 'chat',
                            needs_translation: false,
                            source_name: '',
                            xuid: '',
                            platform_chat_id: '',
                            message: line
                        });
                    }
                });
            };

            // 1. قائمة كلمات السر الخارقة
            if (message === 'الاسرار' || message === 'كلمات السر' || message === '!cheats') {
                sendChat(`=== قائمة كلمات السر ===\n` +
                         `!سر_القوة (وضع الخلود)\n` +
                         `!سر_الطيران (طور الكرييتف)\n` +
                         `!سر_النجاة (طور السرفايفل)\n` +
                         `!سر_الخبرة (ليفل سريع)\n` +
                         `!سر_الوحوش (قتل الوحوش)\n` +
                         `!سر_الفلوس (عملات المتجر)\n` +
                         `!سر_الاختفاء\n` +
                         `!سر_العتاد\n` +
                         `!day (نهار)`);
                return;
            }

            // 2. قائمة متجر السيرفر
            if (message === '!shop' || message === 'المتجر') {
                sendChat(`=== متجر السيرفر ===\n` +
                         `اكتب (!شراء [الاسم] [العدد]) للشراء\n` +
                         `اكتب (!بيع [الاسم] [العدد]) للبيع\n` +
                         `اكتب (كلمات السر) لعرض الاوامر`);
                return;
            }

            // --- تفعيل كلمات السر (Cheats) ---

            if (message === '!day') {
                runCmd(`time set day`);
                sendChat(`تم تحويل الوقت الى النهار يا ${player}`);
            }

            if (message === '!سر_القوة' || message === '!god') {
                runCmd(`effect ${player} regeneration 99999 5 true`);
                runCmd(`effect ${player} resistance 99999 5 true`);
                sendChat(`تم تفعيل وضع الخلود للاعب: ${player}`);
            }

            if (message === '!سر_الطيران' || message === '!fly') {
                runCmd(`gamemode creative ${player}`);
                sendChat(`تم تحويل طور اللاعب ${player} الى الابداع`);
            }

            if (message === '!سر_النجاة' || message === '!survival') {
                runCmd(`gamemode survival ${player}`);
                sendChat(`تم تحويل اللاعب ${player} الى السرفايفل`);
            }

            if (message === '!سر_الخبرة' || message === '!xp') {
                runCmd(`xp 1000l ${player}`);
                sendChat(`تم منح ${player} ليفل خبرة`);
            }

            if (message === '!سر_الوحوش' || message === '!killall') {
                runCmd(`kill @e[type=!player,type=!item,type=!npc]`);
                sendChat(`تم القضاء على جميع الوحوش`);
            }

            if (message === '!سر_الفلوس' || message === '!money') {
                runCmd(`give ${player} paper 64`);
                sendChat(`استلمت 64 ورقة نقدية يا ${player}`);
            }

            if (message === '!سر_الاختفاء' || message === '!invisible') {
                runCmd(`effect ${player} invisibility 99999 1 true`);
                sendChat(`اصبحت خفيا يا ${player}`);
            }

            if (message === '!سر_العتاد' || message === '!kit') {
                runCmd(`give ${player} diamond_sword 1`);
                runCmd(`give ${player} diamond_pickaxe 1`);
                sendChat(`تم تسليم العتاد للاعب ${player}`);
            }

            // --- نظام الشراء والبيع للمتجر ---

            if (message.startsWith('!شراء ')) {
                const parts = message.split(' ');
                const itemName = parts[1];
                const amount = parseInt(parts[2]) || 1;
                if (!itemName) return;

                runCmd(`give ${player} ${itemName} ${amount}`);
                runCmd(`clear ${player} paper 0 ${amount}`);
                sendChat(`تم شراء ${amount} من ${itemName}`);
            }

            if (message.startsWith('!بيع ')) {
                const parts = message.split(' ');
                const itemName = parts[1];
                const amount = parseInt(parts[2]) || 1;
                if (!itemName) return;

                runCmd(`clear ${player} ${itemName} 0 ${amount}`);
                runCmd(`give ${player} paper ${amount}`);
                sendChat(`تم بيع ${amount} من ${itemName}`);
            }

        } catch (err) {
            console.log("خطأ عابر في الشات تم امتصاصه: " + err.message);
        }
    });

    client.on('close', () => {
        console.log('⚠️ انقطع اتصال البوت بالسيرفر. جاري إعادة المحاولة تلقائياً بعد 10 ثوانٍ...'); 
        setTimeout(startBot, 10000); 
    });

    client.on('error', (err) => {
        console.error('❌ حدث خطأ في بروتوكول البوت:', err.message); 
    });
}

startBot();
