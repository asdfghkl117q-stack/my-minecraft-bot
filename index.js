const bedrock = require('bedrock-protocol'); 
const http = require('http'); // مكتبة مدمجة لإنشاء سيرفر ويب وهمي

// سيرفر وهمي لإقناع منصة الاستضافة بأن البوت عبارة عن موقع ويب ليظل يعمل 24 ساعة
http.createServer((req, res) => {
    res.write("Bot is alive and running!");
    res.end();
}).listen(process.env.PORT || 3000);

// إعدادات البوت الصحيحة والمعدلة لسيرفرك الحالي 🛠️
const botOptions = {
    host: 'gold.magmanode.com',   // تم التعديل للسيرفر الجديد
    port: 26354,                  // تم التعديل للمنفذ الجديد
    username: 'ServerKeeper_Bot', 
    offline: true                 
};

function startBot() {
    console.log('جاري محاولة اتصال البوت بالسيرفر الآن...'); 
    const client = bedrock.createClient(botOptions); 

    client.on('spawn', () => {
        console.log(`✅ بنجاح! البوت [${botOptions.username}] متصل الآن داخل السيرفر ويحميه من النوم.`); 
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
