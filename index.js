const http = require('http');
const https = require('https'); // استدعاء مكتبة طلبات الويب الآمنة للاتصال بـ Gemini

// 1. تشغيل سيرفر الويب لـ Render ليبقى البوت يعمل 24/7 دون توقف
const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ServerKeeper Bot connected to Gemini is Online!');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Render] Server listening on port ${PORT}`);
});

// -----------------------------------------------------------------

// 2. إعدادات اتصال ماين كرافت
const bedrock = require('bedrock-protocol');

const botOptions = {
    host: 'gold.magmanode.com',
    port: 26354,
    username: 'ServerKeeper_Bot',
    offline: true,
    skipPing: true
};

// تم دمج مفتاح الـ API الخاص بك هنا بنجاح!
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AQ.Ab8RN6KGGeWaSLcaYz0hhita5fnjfyPqbehzPsjQFkzvWOs9Qg";

const bot = bedrock.createClient(botOptions);

bot.on('spawn', () => {
    console.log(`[Status] ${botOptions.username} connected and ready for chat!`);
});

// دالة تفاعل ذكاء Gemini الاصطناعي
function askGemini(userMessage, playerName, callback) {
    // توجيهات خفية ليتصرف البوت كصديقك المقرب ويرد باختصار ليتفادى الطرد
    const systemPrompt = `أنت الآن تلعب ماين كرافت مع صديقك المفضل الذي يدعى ${playerName}. 
اسمك في اللعبة هو ${botOptions.username}. 
تحدث معه بأسلوب صديق حقيقي، مرح، متعاون، وودود جداً. 
ملاحظة هامة جداً: يجب أن يكون ردك قصيراً للغاية (لا يتجاوز سطرين أو 100 حرف) لكي لا يطردك السيرفر بسبب طول الرسائل وبسرعة. 
الرسالة التي أرسلها لك صديقك هي: "${userMessage}"`;

    const payload = JSON.stringify({
        contents: [{
            parts: [{ text: systemPrompt }]
        }]
    });

    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            try {
                const parsed = JSON.parse(data);
                if (parsed.candidates && parsed.candidates[0].content.parts[0].text) {
                    let reply = parsed.candidates[0].content.parts[0].text.trim();
                    callback(reply);
                } else {
                    callback("أسمعك يا صديقي، لكني أفكر في شيء آخر الآن! 🤔");
                }
            } catch (e) {
                console.error("Gemini JSON Parse Error:", e.message);
                callback("واجهت تشويشاً بسيطاً في عقلي الإلكتروني! 😵‍💫");
            }
        });
    });

    req.on('error', (e) => {
        console.error("Gemini Request Error:", e.message);
        callback("يبدو أن الاتصال بيننا انقطع للحظة! 🌐");
    });

    req.write(payload);
    req.end();
}

// معالجة الأخطاء لضمان عدم انهيار البوت
bot.on('error', (err) => console.error(`[Error]`, err.message));
bot.on('kick', (reason) => console.warn(`[Kick] Reason:`, reason));
bot.on('close', () => console.log(`[Status] Connection closed.`));

bot.on('text', (packet) => {
    try {
        if (!packet.source_name || packet.source_name === botOptions.username) return;

        const message = packet.message.trim();
        const player = packet.source_name;

        // دالة إرسال الشات مع حماية السبام (Anti-Spam)
        const sendChat = (textMsg) => {
            const lines = textMsg.split('\n').filter(line => line.trim().length > 0);
            lines.forEach((line, index) => {
                setTimeout(() => {
                    bot.write('text', {
                        type: 'chat',
                        needs_translation: false,
                        source_name: '',
                        xuid: '',
                        platform_chat_id: '',
                        message: line
                    });
                }, index * 600); // تأخير بسيط بين الأسطر لمنع الطرد
            });
        };

        // دالة تنفيذ الأوامر داخل السيرفر لطلب المساعدة في البناء
        const runCmd = (cmdText) => {
            bot.write('command_request', {
                command: cmdText,
                internal: false,
                version: 1,
                origin: { 
                    type: 'player', 
                    uuid: bot.uuid || '00000000-0000-0000-0000-000000000000', 
                    request_id: '1'
                }
            });
        };

        // 🌟 طريقة التحدث مع البوت: ابدأ رسالتك بـ "يا بوت" أو "يا روبوت" أو "bot"
        if (message.toLowerCase().startsWith('يا بوت') || message.toLowerCase().startsWith('bot') || message.toLowerCase().startsWith('يا روبوت')) {
            // استخلاص السؤال الموجه للبوت
            const cleanMessage = message.replace(/^(يا بوت|bot|يا روبوت)/i, '').trim();
            
            if (cleanMessage.length === 0) {
                sendChat(`نعم يا صديقي ${player}؟ أنا أسمعك، تفضل اسألني أي شيء! 😊`);
                return;
            }

            // إرسال السؤال إلى ذكاء Gemini الاصطناعي للحصول على رد ذكي
            askGemini(cleanMessage, player, (geminiReply) => {
                sendChat(geminiReply);
            });
            return;
        }

        // الأوامر المساعدة السريعة (تنفذ مباشرة لتكون سريعة وبدون ذكاء اصطناعي)
        if (message === 'ابني' || message === 'ابني بيت') {
            sendChat(`سأقوم ببناء بيت خشبي لك الآن يا صديقي! 🔨🏠`);
            setTimeout(() => runCmd(`execute at "${player}" run fill ~2 ~-1 ~2 ~7 ~-1 ~7 planks`), 1000);
            setTimeout(() => runCmd(`execute at "${player}" run fill ~2 ~ ~2 ~7 ~3 ~7 planks 0 outline`), 2500);
            setTimeout(() => runCmd(`execute at "${player}" run fill ~2 ~4 ~2 ~7 ~4 ~7 wooden_slab`), 4000);
            setTimeout(() => {
                runCmd(`execute at "${player}" run setblock ~4 ~ ~2 air`);
                runCmd(`execute at "${player}" run setblock ~4 ~ ~2 wooden_door`);
                sendChat(`تم البناء! أتمنى أن يعجبك تصميمي! 😉`);
            }, 5500);
        }

    } catch (err) {
        console.log("Error inside text event: " + err.message);
    }
});

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
