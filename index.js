const mineflayer = require('mineflayer');

const bot = mineflayer.createBot({
  host: 'localhost', gold.magmanode.com     // اكتب هنا آيبي السيرفر مالتك
  port: 25565,       25566     // بورت السيرفر
  username: 'ServerKeeper_Bot',
  version: '1.20.1'       // غير النسخة حسب نسخة سيرفرك
});

bot.on('spawn', () => {
  console.log('🤖 البوت دخل السيرفر وجاهز للعمل!');
});

// هذا الحدث يشتغل كل ما يتحدث الوقت في اللعبة
bot.on('time', () => {
  // في ماينكرافت، الليل يبدأ لما يكون الوقت أكبر من 13000 وأقل من 23000
  const isNight = bot.time.timeOfDay >= 13000 && bot.time.timeOfDay < 23000;

  // إذا كانت الدنيا ليل والبوت مو نايم حالياً، يروح ينام
  if (isNight && !bot.isSleeping) {
    goToSleep();
  }
});

async function goToSleep() {
  // البحث عن أقرب بلوكة سرير في محيط 32 بلوكة حول البوت
  const bed = bot.findBlock({
    matching: (block) => block.name.includes('bed'),
    maxDistance: 32
  });

  if (bed) {
    console.log('🛏️ لقيت سرير! رايح أنام...');
    try {
      // أمر النوم يتطلب تمرير بلوكة السرير اللي لقاها البوت
      await bot.sleep(bed);
      console.log('😴 البوت نام بنجاح.');
    } catch (err) {
      console.log(`❌ ما كدرت أنام بسبب خطأ: ${err.message}`);
    }
  } else {
    // إذا الدنيا ليل وماكو سرير، يطبع تنبيه بالكونسول كل فترة قصيرة
    if (bot.time.timeOfDay % 1000 === 0) {
      console.log('🔍 الدنيا ليل بس ماكو أي سرير قريب مني!');
    }
  }
}

// حدث يشتغل أول ما البوت يكعد من النوم (سواء صار الصبح أو أحد كعده)
bot.on('wake', () => {
  console.log('☀️ صباح الخير! البوت كعد من النوم وجاهز يكمل شغل.');
});
