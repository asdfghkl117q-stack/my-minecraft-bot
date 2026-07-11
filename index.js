const bedrock = require('bedrock-protocol');
const http = require('http'); // مكتبة مدمجة لإنشاء سيرفر ويب بسيط

// إعدادات الاتصال
const botOptions = {
    host: 'gold.magmanode.com',
    port: 26354,
    username: 'ServerKeeper_Bot',
    offline: true,
    skipPing: true
};

// ----------------- حل مشكلة إغلاق Render الإجباري -----------------
// إنشاء سيرفر ويب وهمي ليظل Render يعتقد أن التطبيق يعمل بشكل ممتاز
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ServerKeeper_Bot is online and running!');
});

server.listen(PORT, () => {
    console.log(`[Render Link] Dummy HTTP server listening on port ${PORT}`);
});
// -----------------------------------------------------------------

const bot = bedrock.createClient(botOptions);

// متغير لحفظ الـ runtime_entity_id الخاص بالبوت لمنع طرده عند تنفيذ الأوامر
let runtimeEntityId = 0;

bot.on('start_game', (packet) => {
    runtimeEntityId = packet.runtime_entity_id;
    console.log(`[Status] Game started. Bot Entity ID: ${runtimeEntityId}`);
});

bot.on('spawn', () => {
    console.log(`[Status] ${botOptions.username} joined the server.`);
});

// معالجة الأخطاء وحالات الطرد لمنع انهيار السكربت
bot.on('error', (err) => {
    console.error(`[Error] Connection error:`, err.message);
});

bot.on('kick', (reason) => {
    console.warn(`[Kick] Bot was kicked from the server. Reason:`, reason);
});

bot.on('close', () => {
    console.log(`[Status] Connection closed.`);
});

bot.on('text', (packet) => {
    try {
        if (!packet.source_name || packet.source_name === botOptions.username) return;

        const message = packet.message.toLowerCase().trim();
        const player = packet.source_name;

        // تنفيذ الأوامر بشكل متوافق مع بروتوكول ماين كرافت لتفادي الطرد
        const runCmd = (cmdText) => {
            bot.write('command_request', {
                command: cmdText,
                internal: false,
                version: 1,
                origin: { 
                    type: 'player', 
                    uuid: bot.uuid || '00000000-0000-0000-0000-000000000000', 
                    request_id: '1',
                    player_entity_id: runtimeEntityId 
                }
            });
        };

        // إرسال رسائل الشات مع تعيين اسم مرسل صحيح لتفادي حظر البوت
        const sendChat = (textMsg) => {
            const lines = textMsg.split('\n');
            lines.forEach((line) => {
                if (line.trim().length > 0) {
                    bot.write('text', {
                        type: 'chat',
                        needs_translation: false,
                        source_name: botOptions.username,
                        xuid: '',
                        platform_chat_id: '',
                        message: line
                    });
                }
            });
        };

        // 1. القوائم
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

        if (message === '!shop' || message === 'المتجر') {
            sendChat(`=== متجر السيرفر ===\n` +
                     `اكتب (!شراء [الاسم] [العدد]) للشراء\n` +
                     `اكتب (!بيع [الاسم] [العدد]) للبيع\n` +
                     `اكتب (كلمات السر) لعرض الأوامر!`);
            return;
        }

        // 2. الأوامر
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
            sendChat(`أصبحت خفياً يا ${player}`);
        }

        if (message === '!سر_العتاد' || message === '!kit') {
            runCmd(`give ${player} diamond_sword 1`);
            runCmd(`give ${player} diamond_pickaxe 1`);
            sendChat(`تم تسليم العتاد للاعب ${player}`);
        }

        // التجارة
        if (message.startsWith('!شراء ')) {
            const parts = message.split(' ');
            const itemName = parts[1];
            const amount = parseInt(parts[2]) || 1;
            runCmd(`give ${player} ${itemName} ${amount}`);
            sendChat(`تم شراء ${amount} من ${itemName}`);
        }

        if (message.startsWith('!بيع ')) {
            const parts = message.split(' ');
            const itemName = parts[1];
            const amount = parseInt(parts[2]) || 1;
            runCmd(`clear ${player} ${itemName} 0 ${amount}`);
            runCmd(`give ${player} paper ${amount}`);
            sendChat(`تم بيع ${amount} من ${itemName}`);
        }

    } catch (err) {
        console.log("Error inside text event: " + err.message);
    }
});

        // 2. الأوامر
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
            sendChat(`أصبحت خفياً يا ${player}`);
        }

        if (message === '!سر_العتاد' || message === '!kit') {
            runCmd(`give ${player} diamond_sword 1`);
            runCmd(`give ${player} diamond_pickaxe 1`);
            sendChat(`تم تسليم العتاد للاعب ${player}`);
        }

        // التجارة
        if (message.startsWith('!شراء ')) {
            const parts = message.split(' ');
            const itemName = parts[1];
            const amount = parseInt(parts[2]) || 1;
            runCmd(`give ${player} ${itemName} ${amount}`);
            sendChat(`تم شراء ${amount} من ${itemName}`);
        }

        if (message.startsWith('!بيع ')) {
            const parts = message.split(' ');
            const itemName = parts[1];
            const amount = parseInt(parts[2]) || 1;
            runCmd(`clear ${player} ${itemName} 0 ${amount}`);
            runCmd(`give ${player} paper ${amount}`);
            sendChat(`تم بيع ${amount} من ${itemName}`);
        }

    } catch (err) {
        console.log("Error inside text event: " + err.message);
    }
});
