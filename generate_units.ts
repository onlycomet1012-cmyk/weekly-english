import fs from 'fs';

const data = {
  1: {
    words: [
      ['feeling', '感觉'], ['tired', '疲惫的'], ['sad', '难过的'], ['angry', '生气的'], ['scared', '害怕的'], ['cry', '哭'], ['laugh', '笑'], ['stamp', '跺（脚）'], ['sleep', '睡觉'], ['new', '新的'], ['game', '游戏'], ['excited', '兴奋的'], ['sorry', '对不起'], ['like', '喜欢；像'], ['but', '但是'], ['unhappy', '不开心的'], ['worried', '担心的'], ['not', '不，不是'], ['lose', '丢失'], ['doll', '玩偶'], ['football', '足球'], ['candy', '糖果'], ['away', '移走'], ['big', '大的'], ['mouse', '老鼠']
    ],
    phrases: [
      ['talk about', '讨论，谈论'], ['go to sleep', '去睡觉'], ['happy birthday!', '生日快乐！'], ['thank you.', '谢谢。'], ['have/has got', '有，拥有'], ['play the game', '玩游戏'], ['play football', '踢足球'], ['all day', '整天'], ['take sb/sth away', '带走······'], ['jump out', '跳出来'], ['a big box of', '一大盒的······'], ['find food', '寻找食物'], ['such as', '例如']
    ],
    sentences: [
      ["Toby's feelings", "托比的感受"], ["Tutu is excited.", "图图很兴奋。"], ["I've got a game. Let's play!", "我有个游戏。我们来玩吧！"], ["I don't like your new game.", "我不喜欢你的新游戏。"], ["Do you like the game? Yes,it's great!", "你喜欢这个游戏吗？是的，太棒了！"], ["Let's play the game. OK! It's fun!", "我们来玩游戏吧。好的！这很有趣！"], ["I'm sorry. Dad. That's OK, Tutu.", "我很抱歉。爸爸。没关系，图图。"], ["How is he/she feeling?", "他/她感觉怎么样？"], ["He is angry/tired.", "他很生气/累。"], ["How are you feeling today?", "你今天感觉怎么样？"], ["I'm happy.", "我很高兴。"], ["Li Ling loses her favourite doll. She is sad.", "李玲失去了她最喜欢的玩偶。她很伤心。"], ["Du Peng plays football all day. He is tired.", "杜鹏整天踢足球。他累了。"], ["A bird takes John's candy away. He is angry.", "一只鸟拿走了约翰的糖果。他很生气。"], ["A big mouse jumps out! Ann is scared.", "一只大老鼠跳了出来！安很害怕。"]
    ]
  },
  2: {
    words: [
      ['from', '从'], ['head', '头'], ['toe', '脚趾'], ['body', '身体；躯干'], ['rock', '摇滚乐'], ['song', '歌曲'], ['touch', '触摸'], ['eye', '眼睛'], ['hair', '头发'], ['ear', '耳朵'], ['wave', '摆动'], ['leg', '腿'], ['foot', '脚'], ['nose', '鼻子'], ['face', '脸'], ['arm', '手臂'], ['hand', '手'], ['mouth', '嘴'], ['tooth', '牙'], ['prize', '奖品'], ['bike', '自行车'], ['race', '竞赛'], ['stretch', '伸展'], ['shake', '摇动'], ['here', '在这里'], ['Mr', '先生'], ['back', '回到原处'], ['worry', '担心'], ['tip', '建议'], ['small', '小的'], ['robot', '机器人'], ['his', '他的']
    ],
    phrases: [
      ['come on', '快来'], ['sing a song', '唱首歌'], ['touch your head', '摸你的头'], ['touch your eyes', '摸摸你的眼睛'], ['touch your hair', '摸摸你的头发'], ['touch your ears', '摸摸你的耳朵'], ['wave your legs', '摆动你的腿'], ['touch your feet', '摸摸你的脚'], ['touch your nose', '摸摸你的鼻子'], ['touch your face', '摸摸你的脸'], ['wave your arms', '摆动你的胳膊'], ['wave your hands', '摆动你的手'], ['open your mouth', '张开你的嘴巴'], ['show your teeth', '看看你的牙齿'], ['school bike race', '学校自行车比赛'], ['stretch your arms', '伸展你的胳膊'], ['stretch your legs', '伸展你的腿'], ['shake your feet', '晃动你的脚'], ['look at', '看向·····'], ['first aid kit', '急救包'], ['kick the ball', '踢球']
    ],
    sentences: [
      ["It's time for the body rock.", "是时候进行身体摇滚了。"], ["Here's your prize", "这是你的奖品"], ["Don't worry. I'm OK. Look at my prize!", "别担心。我很好。看看我的奖品！"], ["That's a nice prize.", "那是一个不错的奖品。"], ["I've got big hands and feet.", "我有一双大手和一双大脚。"], ["He's got big ears.", "他耳朵很大。"], ["He hasn't got hair.", "他没有头发。"], ["This robot has got six hands.", "这个机器人有六只手。"]
    ]
  },
  3: {
    words: [
      ['so', '这么，如此'], ['cool', '酷的'], ['clothes', '衣服'], ['wear', '穿'], ['cap', '帽子'], ['T-shirt', 'T恤'], ['trousers', '裤子'], ['sock', '袜子'], ['shiny', '有光泽的'], ['shoe', '鞋'], ['dress', '连衣裙'], ['sweater', '毛线衣'], ['skirt', '半身裙'], ['shirt', '衬衫'], ['coat', '外套'], ['shorts', '短裤'], ['king', '国王'], ['want', '想要'], ['beautiful', '美丽的'], ['make', '做'], ['magic', '神奇的'], ['clever', '聪明的'], ['them', '它们'], ['month', '一个月；月'], ['later', '之后'], ['try', '试'], ['why', '为什么'], ['wonderful', '令人惊叹的'], ['most', '最'], ['any', '任何的'], ['or', '或'], ['fox', '狐狸'], ['monkey', '猴子'], ['tell', '告诉；说出'], ['truth', '真相'], ['wash', '洗'], ['hang', '悬挂'], ['hat', '帽子'], ['jeans', '牛仔裤'], ['boot', '靴子'], ['robe', '长袍']
    ],
    phrases: [
      ['be ready to go', '准备好做去'], ['look cool', '看起来很酷'], ['make clothes', '做衣服'], ['tell the truth', '讲出事实'], ['one month later', '一个月后'], ['try them on', '试穿一下'], ['come and see', '快来看看'], ['Take out the clothes', '把衣服拿出来'], ['Hang out the T-shirt', '把T恤挂起来'], ['Look up', '抬头看'], ['Hang out the Tousers.', '把裤子挂起来。'], ['Take the clothes back in', '把衣服拿回去'], ['Wash theclothes', '洗衣服'], ['Hang out the shorts.', '把短裤挂起来。'], ['Hang out the socks', '把袜子挂起来'], ['look like', '看起来像']
    ],
    sentences: [
      ["I look so cool today!", "我今天看起来很酷！"], ["A white T-shirt on my back.", "我背上有一件白色T恤。"], ["And blue trousers on my legs.", "我腿上穿着蓝色裤子。"], ["I look cool for school today!", "我今天上学看起来很酷"], ["The king wants beautiful clothes!", "国王想要漂亮的衣服！"], ["We can make clothes for the king.", "我们可以为国王做衣服。"], ["Why can't I see the clothes?Am I not clever?", "为什么我看不见衣服？我不聪明吗？"], ["What wonderful clothes!", "多漂亮的衣服啊！"], ["The king is in his beautiful new clothes!", "国王穿着漂亮的新衣服！"], ["But he isn't wearing any clothes!", "但他没有穿任何衣服！"], ["The foxes can make magic clothes.", "狐狸能制作有魔法的衣服。"], ["The monkey tells the truth.", "猴子说出真相。"], ["Jerry is wearing a hat,a shirt,jeans and boots.", "杰瑞戴着帽子、衬衫、牛仔裤和靴子。"], ["Yang Xue is wearing a red hat,a black and red dress,and black shoes.", "杨雪戴着一顶红帽子，穿着一件黑色和红色的裙子，还有一双黑色的鞋子。"], ["The lake looks like a moon.", "这个湖看起来像月亮。"], ["Amonkey is drinking milk.", "一只猴子正在喝牛奶。"]
    ]
  },
  4: {
    words: [
      ['rain', '雨'], ['shine', '光亮'], ['rainy', '多雨的'], ['run', '跑'], ['windy', '多风的'], ['fly', '放飞'], ['kite', '风筝'], ['park', '公园'], ['hot', '炎热的'], ['sunny', '阳光充足的'], ['swim', '游泳'], ['water', '水'], ['cold', '寒冷的'], ['snowy', '多雪的'], ['throw', '投，扔'], ['snowball', '雪球'], ['raincoat', '雨衣'], ['umbrella', '雨伞'], ['warm', '保暖的'], ['music', '音乐'], ['weather', '天气'], ['bookshop', '书店'], ['wait', '等'], ['wet', '湿的'], ['again', '又'], ['dry', '干燥的'], ['sell', '卖'], ['these', '这些'], ['idea', '主意'], ['club', '俱乐部'], ['stay', '停留'], ['stand', '站立'], ['tree', '树'], ['walk', '走'], ['carefully', '小心地'], ['spring', '春天'], ['summer', '夏天'], ['autumn', '秋天'], ['winter', '冬天'], ['season', '季节'], ['step', '步骤'], ['drawing', '图画'], ['cloudy', '多云的']
    ],
    phrases: [
      ['swim in the water', '在水里游泳'], ['fly kites', '放风筝'], ['throw snowballs', '扔雪球'], ['books for all weather', '全气候图书'], ['take the books outside', '把书带到户外'], ['the All Weather Book Club', '全气候图书俱乐部'], ['the next day', '第二天'], ['go out to play', '去外面玩'], ['stay away from', '远离'], ['Walk carefully!', '小心走路!'], ['a book club', '图书俱乐部'], ['read books', '读书。'], ['draw a window.', '画窗户。'], ['cut the window', '剪窗户']
    ],
    sentences: [
      ["How do we play on a rainy,rainy day?", "我们怎么玩 在一个阴雨天？"], ["We run and we jump on a rainy,rainy day!", "我们跑，我们跳在一个阴雨天！"], ["I've got my raincoat and umbrella.", "我有雨衣和雨伞"], ["It's rainy/windy/suny.", "下雨/刮风/晴天。"], ["What's the weather like?", "天气怎么样？"], ["It's sunny and cool", "天气晴朗，很凉爽"], ["Let's take the books outside.", "我们把书拿到外面去吧。"], ["Welcome to the All Weather Book Club!", "欢迎来到全天候图书俱乐部！"], ["I don't want to play outside.", "我不想在外面玩。"], ["They read books in the club.", "他们在俱乐部看书。"], ["They wait in front of a bookshop", "他们在书店前等着。"], ["Stay away from the board!", "远离广告牌"], ["Don't stand under the tree!", "别站在树下！"], ["What's your favourite season?I like spring best.", "你最喜欢的季节是什么？我最喜欢春天。"], ["What's the weather like in spring? It's warm.", "春天的天气怎么样？天气很暖和。"], ["What do you do in spring? I fly a kite.", "你在春天做什么？我放风筝。"], ["What's the season? It's autumn.", "什么季节？它是秋天。"]
    ]
  },
  5: {
    words: [
      ['week', '星期'], ['Monday', '星期一'], ['Tuesday', '星期二'], ['Wednesday', '星期三'], ['Thursday', '星期四'], ['Friday', '星期五'], ['Saturday', '星期六'], ['Sunday', '星期日'], ['before', '在……以前'], ['after', '在……后'], ['room', '房间'], ['close', '关，闭合'], ['much', '非常'], ['rabbit', '兔'], ['cat', '猫'], ['fish', '鱼'], ['busy', '忙碌的'], ['every', '每一个'], ['cook', '烹调'], ['study', '学习'], ['basketball', '篮球']
    ],
    phrases: [
      ['the day before', '······的前一天'], ['the day after', '······的后一天'], ['close your eyes', '闭上你的眼睛'], ['open your eyes', '睁开你的眼睛'], ['so much', '太，很，非常'], ['paint pictures', '画画'], ['on the wall', '在墙上'], ['of course', '当然'], ['WuShu Club', '武术俱乐部'], ['Singing Club', '唱歌俱乐部'], ['Cooking Club', '烹饪俱乐部'], ['Chinese Chess Club', '象棋俱乐部'], ['study English', '学英语'], ['play basketball', '打篮球'], ['clean my room', '打扫房间'], ['wake up', '醒醒，醒来'], ['visit the zoo', '游览动物园'], ['go to the zoo', '去动物园']
    ],
    sentences: [
      ["Days of the week", "一周中的几天"], ["It's sunny on Monday.", "星期一阳光明媚。"], ["What day is it today? It's Friday.", "今天星期几？今天是星期五。"], ["How do you like your new room?", "你喜欢你的新房间吗？"], ["I don't like pink so much now!", "我现在不太喜欢粉红色了！"], ["Can I paint pictures on the wall?", "我可以在墙上画画吗？"], ["Nana has got a busy week", "娜娜有忙碌了一周"], ["She paints a red bird on Monday", "她星期一画了一只红鸟"], ["Meet every Wednesday and do wushu.", "每周三聚会，做武术。"], ["Come to the club on Friday. Let's cook!", "星期五来俱乐部。我们做饭吧！"], ["Let's meet on Monday. It's a great game!", "我们星期一见吧。这是一场精彩的比赛！"]
    ]
  },
  6: {
    words: [
      ['eat', '吃'], ['apple', '苹果'], ['egg', '鸡蛋'], ['bread', '面包'], ['milk', '奶'], ['rice', '米；米饭'], ['tomato', '西红柿'], ['juice', '果汁'], ['ice cream', '冰激凌'], ['chicken', '鸡肉'], ['noodle', '面条'], ['banana', '香蕉'], ['finish', '结尾'], ['dinner', '正餐'], ['welcome', '欢迎'], ['parent', '父，母'], ['dish', '一道菜'], ['meat', '肉'], ['really', '真的'], ['mushroom', '蘑菇'], ['potato', '土豆'], ['eggplant', '茄子'], ['believe', '相信'], ['Chinese', '中国的'], ['food', '食物'], ['amazing', '惊人的'], ['say', '说'], ['tummy', '肚子'], ['yummy', '很好吃的'], ['grape', '葡萄'], ['vegetable', '蔬菜'], ['soup', '汤'], ['pizza', '比萨饼'], ['drink', '饮料'], ['dumpling', '水饺'], ['need', '需要'], ['wrapper', '包装材料'], ['mix', '（使）混合'], ['carrot', '胡萝卜'], ['add', '添加'], ['salt', '盐'], ['oil', '植物油，动物油'], ['minute', '分，分钟']
    ],
    phrases: [
      ['come in', '进来'], ['meet my parents', '见见我的父母'], ['meat dish', '肉菜'], ['Chinese food', '中国菜'], ['come to', '去到······'], ['say about', '谈论'], ['vegetable soup', '蔬菜汤'], ['make dumplings', '做饺子'], ['dumpling wrappers', '饺子皮'], ['cook the eggs', '煮鸡蛋'], ['cut the carrots', '切胡萝卜'], ['add oil and salt', '加入盐和油'], ['put in', '把······放进·····'], ['eat the dumplings', '吃饺子'], ['mix the eggs and carrots', '把鸡蛋和胡萝卜混合在一起。']
    ],
    sentences: [
      ["Li Feifei likes noodles and oranges.", "李飞飞喜欢面条和桔子。"], ["What's for dinner?", "晚饭吃什么？"], ["Dinner is ready.", "晚饭准备好了。"], ["Do you like the dishes?", "你喜欢这些菜吗？"], ["I like these meat dishes!", "我喜欢这些肉菜！"], ["These are mushrooms and eggplants.", "这些是蘑菇和茄子。"], ["I cant believe it.", "我简直不敢相信。"], ["Chinese food is amazing!", "中国菜太棒了！"], ["Who comes to Nana's home?", "谁来娜娜家？"], ["What are the three dishes?", "这三道菜是什么？"], ["What does Tom say about Chinese food?", "汤姆怎么说中国菜？"], ["My favourite food is pizza and my favourite drink is milk.", "我最喜欢的食物是披萨，最喜欢的饮料是牛奶 。"], ["Put the eggs and carrots in the wrappers.", "把鸡蛋和胡萝卜放在包装纸里。"], ["Cook the dumplings for about six minutes.", "把饺子煮大约六分钟。"]
    ]
  }
};

let output = `import { WordData } from './types';

export const UNIT_DATA: Record<number, WordData[]> = {
`;

for (let i = 1; i <= 6; i++) {
  output += `  ${i}: [\n`;
  const unit = data[i];
  let idCounter = 1;
  
  unit.words.forEach(w => {
    output += `    { id: '${i}_${idCounter++}', word: ${JSON.stringify(w[0])}, definition: ${JSON.stringify(w[1])}, exampleSentence: "", partOfSpeech: 'word', correctCount: 0 },\n`;
  });
  unit.phrases.forEach(w => {
    output += `    { id: '${i}_${idCounter++}', word: ${JSON.stringify(w[0])}, definition: ${JSON.stringify(w[1])}, exampleSentence: "", partOfSpeech: 'phrase', correctCount: 0 },\n`;
  });
  unit.sentences.forEach(w => {
    output += `    { id: '${i}_${idCounter++}', word: ${JSON.stringify(w[0])}, definition: ${JSON.stringify(w[1])}, exampleSentence: "", partOfSpeech: 'sentence', correctCount: 0 },\n`;
  });
  
  output += `  ],\n`;
}

output += `};\n`;

fs.writeFileSync('units.ts', output);
