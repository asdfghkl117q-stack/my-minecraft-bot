const bedrock = require('bedrock-protocol'); //[span_0](start_span)[span_0](end_span)
const http = require('http'); // مكتبة مدمجة لإنشاء سيرفر ويب وهمي

// سيرفر وهمي لإقناع منصة الاستضافة بأن البوت عبارة عن موقع ويب ليظل يعمل 24 ساعة
http.createServer((req, res) => {
    res.write("Bot is alive and running!");
    res.end();
}).listen(process.env.PORT || 3000);

// إعدادات البوت الخاصة بك[span_1](start_span)[span_1](end_span)
const botOptions = {
    host: 'dynamic-10.magmanode.com',   //[span_2](start_span)[span_2](end_span)
    port: 25566,                        //[span_3](start_span)[span_3](end_span)
    username: 'ServerKeeper_Bot',       //[span_4](start_span)[span_4](end_span)
    offline: true                       //[span_5](start_span)[span_5](end_span)
};

function startBot() {
    console.log('جاري محاولة اتصال البوت بالسيرفر الآن...'); //[span_6](start_span)[span_6](end_span)
    const client = bedrock.createClient(botOptions); //[span_7](start_span)[span_7](end_span)

    client.on('spawn', () => {
        console.log(`✅ بنجاح! البوت [${botOptions.username}] متصل الآن داخل السيرفر ويحميه من النوم.`); //[span_8](start_span)[span_8](end_span)
    });

    client.on('close', () => {
        console.log('⚠️ انقطع اتصال البوت بالسيرفر. جاري إعادة المحاولة تلقائياً بعد 10 ثوانٍ...'); //[span_9](start_span)[span_9](end_span)
        setTimeout(startBot, 10000); //[span_10](start_span)[span_10](end_span)
    });

    client.on('error', (err) => {
        console.error('❌ حدث خطأ في بروتوكول البوت:', err.message); //[span_11](start_span)[span_11](end_span)
    });
}

startBot(); //[span_12](start_span)[span_12](end_span)
