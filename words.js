// 保育園児向けタイピングゲーム用単語データベース
// ひらがな → ローマ字変換

const WORD_SETS = {
    // やさしい（ひらがな 2-3文字）
    easy: [
        { hiragana: 'あり', romaji: 'ari', meaning: '虫の名前' },
        { hiragana: 'いか', romaji: 'ika', meaning: '海の生き物' },
        { hiragana: 'うし', romaji: 'usi', meaning: 'ミルクを出す動物' },
        { hiragana: 'えび', romaji: 'ebi', meaning: '赤い海の生き物' },
        { hiragana: 'おに', romaji: 'oni', meaning: '角がある怖いもの' },
        { hiragana: 'かに', romaji: 'kani', meaning: 'はさみがある生き物' },
        { hiragana: 'きつね', romaji: 'kitune', meaning: 'しっぽがふわふわの動物' },
        { hiragana: 'くま', romaji: 'kuma', meaning: '大きな森の動物' },
        { hiragana: 'けむし', romaji: 'kemusi', meaning: 'ちょうちょになる虫' },
        { hiragana: 'こい', romaji: 'koi', meaning: '池にいる魚' },
        { hiragana: 'さる', romaji: 'saru', meaning: '木登りが得意な動物' },
        { hiragana: 'しか', romaji: 'sika', meaning: '角がある優しい動物' },
        { hiragana: 'すし', romaji: 'susi', meaning: '日本の美味しい料理' },
        { hiragana: 'せみ', romaji: 'semi', meaning: '夏に鳴く虫' },
        { hiragana: 'そら', romaji: 'sora', meaning: '青くて高いところ' },
        { hiragana: 'たこ', romaji: 'tako', meaning: '8本足の海の生き物' },
        { hiragana: 'ちょう', romaji: 'tyou', meaning: 'きれいな羽の虫' },
        { hiragana: 'つき', romaji: 'tuki', meaning: '夜に見える丸いもの' },
        { hiragana: 'てんとう', romaji: 'tentou', meaning: '赤い背中の虫' },
        { hiragana: 'とり', romaji: 'tori', meaning: '空を飛ぶ動物' },
        { hiragana: 'なす', romaji: 'nasu', meaning: '紫色の野菜' },
        { hiragana: 'にじ', romaji: 'niji', meaning: '雨上がりに見える色とりどり' },
        { hiragana: 'ぬいぐるみ', romaji: 'nuigurumi', meaning: 'ふわふわのおもちゃ' },
        { hiragana: 'ねこ', romaji: 'neko', meaning: 'にゃんと鳴く動物' },
        { hiragana: 'のみ', romaji: 'nomi', meaning: '小さな虫' },
        { hiragana: 'はち', romaji: 'hati', meaning: '蜂蜜を作る虫' },
        { hiragana: 'ひよこ', romaji: 'hiyoko', meaning: '黄色い鳥の赤ちゃん' },
        { hiragana: 'ふね', romaji: 'hune', meaning: '水に浮かぶ乗り物' },
        { hiragana: 'へび', romaji: 'hebi', meaning: '長い体の動物' },
        { hiragana: 'ほし', romaji: 'hosi', meaning: '夜空に光るもの' },
        { hiragana: 'まめ', romaji: 'mame', meaning: '小さな食べ物' },
        { hiragana: 'みず', romaji: 'mizu', meaning: '透明で飲むもの' },
        { hiragana: 'むし', romaji: 'musi', meaning: '小さな生き物' },
        { hiragana: 'めだか', romaji: 'medaka', meaning: '小さな魚' },
        { hiragana: 'もち', romaji: 'moti', meaning: 'お正月に食べるもの' },
        { hiragana: 'やぎ', romaji: 'yagi', meaning: '角がある白い動物' },
        { hiragana: 'ゆき', romaji: 'yuki', meaning: '冬に降る白いもの' },
        { hiragana: 'よつば', romaji: 'yotuba', meaning: '四つの葉っぱ' },
        { hiragana: 'らっこ', romaji: 'rakko', meaning: '背泳ぎする動物' },
        { hiragana: 'りす', romaji: 'risu', meaning: 'どんぐりが好きな動物' },
        { hiragana: 'るり', romaji: 'ruri', meaning: '青い鳥' },
        { hiragana: 'れもん', romaji: 'remon', meaning: '黄色い酸っぱい果物' },
        { hiragana: 'ろば', romaji: 'roba', meaning: '耳が長い動物' },
    ],

    // ふつう（ひらがな 4-5文字）
    normal: [
        { hiragana: 'あひる', romaji: 'ahiru', meaning: '水鳥の仲間' },
        { hiragana: 'いちご', romaji: 'itigo', meaning: '赤くて甘い果物' },
        { hiragana: 'うさぎ', romaji: 'usagi', meaning: '耳が長い動物' },
        { hiragana: 'えんぴつ', romaji: 'enpitu', meaning: '字を書く道具' },
        { hiragana: 'おもちゃ', romaji: 'omotya', meaning: '遊ぶための道具' },
        { hiragana: 'かぶとむし', romaji: 'kabutomusi', meaning: '角がある強い虫' },
        { hiragana: 'きりん', romaji: 'kirin', meaning: '首が長い動物' },
        { hiragana: 'くじら', romaji: 'kujira', meaning: '海で一番大きな動物' },
        { hiragana: 'けーき', romaji: 'ke-ki', meaning: '誕生日に食べる甘いもの' },
        { hiragana: 'こあら', romaji: 'koara', meaning: 'ユーカリを食べる動物' },
        { hiragana: 'さかな', romaji: 'sakana', meaning: '水の中で泳ぐ生き物' },
        { hiragana: 'しまうま', romaji: 'simauma', meaning: '白と黒のしま模様の動物' },
        { hiragana: 'すいか', romaji: 'suika', meaning: '夏の大きな果物' },
        { hiragana: 'せんせい', romaji: 'sensei', meaning: '教えてくれる人' },
        { hiragana: 'そふと', romaji: 'sohuto', meaning: 'やわらかいもの' },
        { hiragana: 'たまご', romaji: 'tamago', meaning: 'ひよこが生まれるもの' },
        { hiragana: 'ちゅーりっぷ', romaji: 'tyu-rippu', meaning: '春に咲く花' },
        { hiragana: 'つくえ', romaji: 'tukue', meaning: '勉強する時に使う家具' },
        { hiragana: 'てれび', romaji: 'telebi', meaning: '番組を見る機械' },
        { hiragana: 'とまと', romaji: 'tomato', meaning: '赤い野菜' },
        { hiragana: 'なっとう', romaji: 'nattou', meaning: 'ねばねばした食べ物' },
        { hiragana: 'にんじん', romaji: 'ninjin', meaning: 'オレンジ色の野菜' },
        { hiragana: 'ぬりえ', romaji: 'nurie', meaning: '色を塗って遊ぶもの' },
        { hiragana: 'ねずみ', romaji: 'nezumi', meaning: 'チーズが好きな小さな動物' },
        { hiragana: 'のりもの', romaji: 'norimono', meaning: '乗って移動するもの' },
        { hiragana: 'はんばーが', romaji: 'hanba-ga', meaning: 'パンに挟んだ料理' },
        { hiragana: 'ひまわり', romaji: 'himawari', meaning: '大きな黄色い花' },
        { hiragana: 'ふうせん', romaji: 'huusen', meaning: '空に飛ぶ丸いもの' },
        { hiragana: 'へりこぷた', romaji: 'herikoputa', meaning: 'プロペラで飛ぶ乗り物' },
        { hiragana: 'ほたる', romaji: 'hotaru', meaning: '光る虫' },
        { hiragana: 'みかん', romaji: 'mikan', meaning: 'オレンジ色の果物' },
        { hiragana: 'むかで', romaji: 'mukade', meaning: '足がたくさんある虫' },
        { hiragana: 'めろん', romaji: 'meron', meaning: '緑色の甘い果物' },
        { hiragana: 'もんしろ', romaji: 'monsiro', meaning: '白いちょうちょ' },
        { hiragana: 'やさい', romaji: 'yasai', meaning: '体に良い食べ物' },
        { hiragana: 'ゆうびん', romaji: 'yuubin', meaning: '手紙を届けるサービス' },
        { hiragana: 'よっと', romaji: 'yotto', meaning: '風で進む小さな船' },
        { hiragana: 'らいおん', romaji: 'raion', meaning: '百獣の王' },
        { hiragana: 'りんご', romaji: 'ringo', meaning: '赤い果物' },
        { hiragana: 'るーる', romaji: 'ru-ru', meaning: '決まりや約束' },
        { hiragana: 'れっしゃ', romaji: 'ressya', meaning: '線路を走る乗り物' },
        { hiragana: 'ろけっと', romaji: 'roketto', meaning: '宇宙に飛ぶ乗り物' },
    ],

    // むずかしい（ひらがな 6文字以上）
    hard: [
        { hiragana: 'あまがえる', romaji: 'amagaeru', meaning: '雨に鳴くかえる' },
        { hiragana: 'いるか', romaji: 'iruka', meaning: '海で賢い動物' },
        { hiragana: 'うみがめ', romaji: 'umigame', meaning: '海にいる大きなかめ' },
        { hiragana: 'えれべーた', romaji: 'erebe-ta', meaning: '上下に動く部屋' },
        { hiragana: 'おーけすとら', romaji: 'o-kesutora', meaning: 'たくさんの楽器で演奏' },
        { hiragana: 'かんがるー', romaji: 'kangaru-', meaning: '袋を持つ動物' },
        { hiragana: 'きりぎりす', romaji: 'kirigrisu', meaning: '鳴き声がきれいな虫' },
        { hiragana: 'くりすます', romaji: 'kurisumasu', meaning: '12月の楽しい日' },
        { hiragana: 'けーきやさん', romaji: 'ke-kiyasan', meaning: 'ケーキを作る人' },
        { hiragana: 'こんぴゅーた', romaji: 'konpyuta', meaning: 'いろいろできる機械' },
        { hiragana: 'さんどいっち', romaji: 'sandoitti', meaning: 'パンに挟んだ食べ物' },
        { hiragana: 'しゃぼんだま', romaji: 'syabondama', meaning: '石鹸でできる泡' },
        { hiragana: 'すぱげってぃ', romaji: 'supagetti', meaning: '長い麺の料理' },
        { hiragana: 'せーたー', romaji: 'se-ta-', meaning: '毛糸で作った服' },
        { hiragana: 'そふとくりーむ', romaji: 'sohutokuri-mu', meaning: '冷たくて甘いおやつ' },
        { hiragana: 'たんぽぽ', romaji: 'tanpopo', meaning: '黄色い綿毛の花' },
        { hiragana: 'ちんぱんじー', romaji: 'tinpanji-', meaning: '人に似た動物' },
        { hiragana: 'つりばり', romaji: 'turibari', meaning: '魚を釣る道具' },
        { hiragana: 'てんとうむし', romaji: 'tentoumusi', meaning: '赤い背中に黒い点の虫' },
        { hiragana: 'とらんぽりん', romaji: 'toranporin', meaning: '跳ねて遊ぶ道具' },
        { hiragana: 'なべりょうり', romaji: 'naberyouri', meaning: '鍋で作る温かい料理' },
        { hiragana: 'にじのはし', romaji: 'nijinohasi', meaning: '虹がかかる橋' },
        { hiragana: 'ぬいぐるみやさん', romaji: 'nuigurumiyasan', meaning: 'ぬいぐるみを売る店' },
        { hiragana: 'ねずみのすみか', romaji: 'nezuminosumika', meaning: 'ねずみが住む場所' },
        { hiragana: 'のぞみでんしゃ', romaji: 'nozomidensya', meaning: '早く走る電車' },
        { hiragana: 'はんばーがーやさん', romaji: 'hanba-ga-yasan', meaning: 'ハンバーガーを売る店' },
        { hiragana: 'ひこうき', romaji: 'hikouki', meaning: '空を飛ぶ乗り物' },
        { hiragana: 'ふらいぱん', romaji: 'huraipan', meaning: '料理を作る道具' },
        { hiragana: 'へりこぷたー', romaji: 'herikoputar', meaning: '回るはねで飛ぶ乗り物' },
        { hiragana: 'ほっとけーき', romaji: 'hottoke-ki', meaning: 'ふわふわの甘いもの' },
        { hiragana: 'ままごとあそび', romaji: 'mamagotoasobi', meaning: 'おうちごっこの遊び' },
        { hiragana: 'みずようかん', romaji: 'mizuyoukan', meaning: '夏の和菓子' },
        { hiragana: 'むしとりあみ', romaji: 'musitorami', meaning: '虫を捕まえる道具' },
        { hiragana: 'めがねざる', romaji: 'meganezaru', meaning: 'めがねをかけたような顔の猿' },
        { hiragana: 'もーにんぐ', romaji: 'mo-ningu', meaning: '朝の時間' },
        { hiragana: 'やきゅうぼーる', romaji: 'yakyubo-ru', meaning: '野球で使うボール' },
        { hiragana: 'ゆめのくに', romaji: 'yumenokuni', meaning: '寝ている時に見る世界' },
        { hiragana: 'よーぐると', romaji: 'yo-guruto', meaning: '酸っぱくて体に良い食べ物' },
        { hiragana: 'らじおたいそう', romaji: 'rajiotaisou', meaning: 'ラジオに合わせて体を動かす' },
        { hiragana: 'りもこんからー', romaji: 'rimokonkara-', meaning: '遠くから動かす道具' },
        { hiragana: 'るーれっと', romaji: 'ru-retto', meaning: '回して遊ぶゲーム' },
        { hiragana: 'れいぞうこ', romaji: 'reizouko', meaning: '食べ物を冷やす機械' },
        { hiragana: 'ろーらーすけーと', romaji: 'ro-ra-suke-to', meaning: 'ローラーで滑る靴' },
    ]
};

// 単語セットを取得する関数
function getWordSet(difficulty) {
    const validDifficulties = ['easy', 'normal', 'hard'];
    if (!validDifficulties.includes(difficulty)) {
        console.warn(`無効な難易度: ${difficulty}. "easy"を使用します。`);
        difficulty = 'easy';
    }
    return WORD_SETS[difficulty];
}

// ランダムに単語を取得する関数
function getRandomWord(difficulty) {
    const wordSet = getWordSet(difficulty);
    const randomIndex = Math.floor(Math.random() * wordSet.length);
    return wordSet[randomIndex];
}

// 指定数の単語をランダムに取得する関数（重複なし）
function getRandomWords(difficulty, count) {
    const wordSet = getWordSet(difficulty);
    const shuffled = [...wordSet].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, wordSet.length));
}

// ローマ字をひらがなに変換するためのマッピング
const ROMAJI_TO_HIRAGANA = {
    'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',
    'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
    'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご',
    'sa': 'さ', 'si': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
    'za': 'ざ', 'zi': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ',
    'ta': 'た', 'ti': 'ち', 'tu': 'つ', 'te': 'て', 'to': 'と',
    'da': 'だ', 'di': 'ぢ', 'du': 'づ', 'de': 'で', 'do': 'ど',
    'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
    'ha': 'は', 'hi': 'ひ', 'hu': 'ふ', 'he': 'へ', 'ho': 'ほ',
    'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
    'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ',
    'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
    'ya': 'や', 'yu': 'ゆ', 'yo': 'よ',
    'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
    'wa': 'わ', 'wo': 'を', 'n': 'ん',
    // 濁音・半濁音・拗音も追加可能
    'kya': 'きゃ', 'kyu': 'きゅ', 'kyo': 'きょ',
    'sha': 'しゃ', 'shu': 'しゅ', 'sho': 'しょ',
    'cha': 'ちゃ', 'chu': 'ちゅ', 'cho': 'ちょ',
    'nya': 'にゃ', 'nyu': 'にゅ', 'nyo': 'にょ',
    'hya': 'ひゃ', 'hyu': 'ひゅ', 'hyo': 'ひょ',
    'mya': 'みゃ', 'myu': 'みゅ', 'myo': 'みょ',
    'rya': 'りゃ', 'ryu': 'りゅ', 'ryo': 'りょ'
};

// 難易度別の統計情報
function getWordSetStats() {
    return {
        easy: {
            count: WORD_SETS.easy.length,
            avgLength: (WORD_SETS.easy.reduce((sum, word) => sum + word.hiragana.length, 0) / WORD_SETS.easy.length).toFixed(1),
            description: '2-3文字のひらがな'
        },
        normal: {
            count: WORD_SETS.normal.length,
            avgLength: (WORD_SETS.normal.reduce((sum, word) => sum + word.hiragana.length, 0) / WORD_SETS.normal.length).toFixed(1),
            description: '4-5文字のひらがな'
        },
        hard: {
            count: WORD_SETS.hard.length,
            avgLength: (WORD_SETS.hard.reduce((sum, word) => sum + word.hiragana.length, 0) / WORD_SETS.hard.length).toFixed(1),
            description: '6文字以上のひらがな'
        }
    };
}

// モジュールエクスポート（Node.js環境用）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        WORD_SETS,
        getWordSet,
        getRandomWord,
        getRandomWords,
        getWordSetStats,
        ROMAJI_TO_HIRAGANA
    };
}