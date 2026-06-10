import { createContext, useContext, useState } from 'react';

export const LANGUAGES = [
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'my', label: 'မြန်မာ',    flag: '🇲🇲' },
  { code: 'th', label: 'ไทย',       flag: '🇹🇭' },
  { code: 'zh', label: '中文',       flag: '🇨🇳' },
];

export const TRANSLATIONS = {
  en: {
    // Navbar
    nav_services:   'Services',
    nav_dashboard:  'Dashboard',
    nav_signin:     'Sign In',
    nav_getstarted: 'Get Started',
    nav_signout:    'Sign Out',
    nav_profile:    'My Profile',
    nav_messages:   'Messages',
    nav_myservices: 'My Services',
    nav_search_ph:  'Search services...',

    // Hero
    hero_badge:    'Trusted by 10,000+ customers',
    hero_title1:   'Find Trusted Local',
    hero_title2:   'Services Near You',
    hero_subtitle: 'Connect with verified service professionals in your area. Book instantly. Rate honestly. Trust fully.',
    hero_search_ph:'What service are you looking for?',
    hero_btn:      'Search',
    hero_stat_svc: 'Services',
    hero_stat_pro: 'Providers',
    hero_stat_rat: 'Avg Rating',

    // Categories
    cat_title:    'Browse by Category',
    cat_subtitle: 'Find exactly what you need',

    // How it works
    how_title:    'How ServiceHub Works',
    how_1_title:  'Search Services',
    how_1_desc:   'Browse hundreds of local services. Filter by category, location, price, or rating.',
    how_2_title:  'Book Instantly',
    how_2_desc:   'Select your preferred date and time. Add special notes for the provider.',
    how_3_title:  'Rate & Review',
    how_3_desc:   'After service completion, share your experience to help others.',

    // CTA
    cta_title:    'Ready to Get Started?',
    cta_subtitle: 'Join thousands of satisfied customers and trusted service providers',
    cta_btn1:     'Get Started Free',
    cta_btn2:     'Browse Services',

    // Featured
    featured_title:    'Featured Services',
    featured_subtitle: 'Top-rated services chosen for quality',
    featured_viewall:  'View All →',
    featured_explore:  'Explore All Services →',
  },

  my: {
    // Navbar
    nav_services:   'ဝန်ဆောင်မှုများ',
    nav_dashboard:  'ဒက်ရှ်ဘုတ်',
    nav_signin:     'ဝင်ရောက်ရန်',
    nav_getstarted: 'စတင်ရန်',
    nav_signout:    'ထွက်ရန်',
    nav_profile:    'ကျွန်ုပ်ပရိုဖိုင်',
    nav_messages:   'မက်ဆေ့ချ်များ',
    nav_myservices: 'ကျွန်ုပ်ဝန်ဆောင်မှုများ',
    nav_search_ph:  'ဝန်ဆောင်မှုများရှာဖွေပါ...',

    // Hero
    hero_badge:    'ဖောက်သည် ၁၀,၀၀၀+ က ယုံကြည်သည်',
    hero_title1:   'သင့်နေရာနှင့်နီးသော',
    hero_title2:   'ယုံကြည်ရသောဝန်ဆောင်မှုများ',
    hero_subtitle: 'သင့်နေရာတွင် အတည်ပြုထားသောဝန်ဆောင်မှုပေးသူများနှင့်ချိတ်ဆက်ပါ။ ချက်ချင်းကြိုတင်ဘွတ်ကင်လုပ်ပါ။',
    hero_search_ph:'မည်သည့်ဝန်ဆောင်မှုကိုရှာဖွေနေသနည်း?',
    hero_btn:      'ရှာဖွေပါ',
    hero_stat_svc: 'ဝန်ဆောင်မှုများ',
    hero_stat_pro: 'ဝန်ဆောင်မှုပေးသူများ',
    hero_stat_rat: 'ပျမ်းမျှအဆင့်',

    // Categories
    cat_title:    'အမျိုးအစားများဖြင့်ရှာဖွေပါ',
    cat_subtitle: 'သင်လိုအပ်သည့်အရာကိုတိကျစွာရှာဖွေပါ',

    // How it works
    how_title:    'ServiceHub သည်မည်သို့အလုပ်လုပ်သနည်း',
    how_1_title:  'ဝန်ဆောင်မှုများရှာဖွေပါ',
    how_1_desc:   'ဒေသဆိုင်ရာဝန်ဆောင်မှုများကိုကြည့်ရှုပါ။ အမျိုးအစား၊ တည်နေရာ၊ ဈေးနှုန်း သို့မဟုတ် အဆင့်ဖြင့်စစ်ထုတ်ပါ။',
    how_2_title:  'ချက်ချင်းကြိုတင်ဘွတ်ကင်လုပ်ပါ',
    how_2_desc:   'သင်နှစ်သက်သောရက်စွဲနှင့်အချိန်ကိုရွေးချယ်ပါ။ ဝန်ဆောင်မှုပေးသူအတွက်မှတ်ချက်များထည့်ပါ။',
    how_3_title:  'အဆင့်ဖြင့်သုံးသပ်ချက်ပေးပါ',
    how_3_desc:   'ဝန်ဆောင်မှုပြီးဆုံးပြီးနောက် သင့်အတွေ့အကြုံကိုမျှဝေပါ။',

    // CTA
    cta_title:    'စတင်ရန်အဆင်သင့်ဖြစ်ပြီလား?',
    cta_subtitle: 'ကျေနပ်သောဖောက်သည်များနှင့်ယုံကြည်ရသောဝန်ဆောင်မှုပေးသူများနှင့်ပူးပေါင်းပါ',
    cta_btn1:     'အခမဲ့စတင်ပါ',
    cta_btn2:     'ဝန်ဆောင်မှုများကြည့်ရှုပါ',

    // Featured
    featured_title:    'အထူးဝန်ဆောင်မှုများ',
    featured_subtitle: 'အရည်အသွေးအတွက်ရွေးချယ်ထားသောအဆင့်မြင့်ဝန်ဆောင်မှုများ',
    featured_viewall:  'အားလုံးကြည့်ရှုပါ →',
    featured_explore:  'ဝန်ဆောင်မှုအားလုံးကိုရှာဖွေပါ →',
  },

  th: {
    // Navbar
    nav_services:   'บริการ',
    nav_dashboard:  'แดชบอร์ด',
    nav_signin:     'เข้าสู่ระบบ',
    nav_getstarted: 'เริ่มต้น',
    nav_signout:    'ออกจากระบบ',
    nav_profile:    'โปรไฟล์ของฉัน',
    nav_messages:   'ข้อความ',
    nav_myservices: 'บริการของฉัน',
    nav_search_ph:  'ค้นหาบริการ...',

    // Hero
    hero_badge:    'ลูกค้าเชื่อถือมากกว่า 10,000 ราย',
    hero_title1:   'ค้นหาบริการท้องถิ่น',
    hero_title2:   'ที่เชื่อถือได้ใกล้คุณ',
    hero_subtitle: 'เชื่อมต่อกับผู้ให้บริการมืออาชีพที่ได้รับการยืนยันในพื้นที่ของคุณ จองได้ทันที ให้คะแนนอย่างซื่อสัตย์',
    hero_search_ph:'คุณกำลังมองหาบริการอะไร?',
    hero_btn:      'ค้นหา',
    hero_stat_svc: 'บริการ',
    hero_stat_pro: 'ผู้ให้บริการ',
    hero_stat_rat: 'คะแนนเฉลี่ย',

    // Categories
    cat_title:    'เรียกดูตามหมวดหมู่',
    cat_subtitle: 'ค้นหาสิ่งที่คุณต้องการอย่างแม่นยำ',

    // How it works
    how_title:    'ServiceHub ทำงานอย่างไร',
    how_1_title:  'ค้นหาบริการ',
    how_1_desc:   'เรียกดูบริการในพื้นที่หลายร้อยรายการ กรองตามหมวดหมู่ ตำแหน่งที่ตั้ง ราคา หรือคะแนน',
    how_2_title:  'จองทันที',
    how_2_desc:   'เลือกวันและเวลาที่คุณต้องการ เพิ่มหมายเหตุพิเศษสำหรับผู้ให้บริการ',
    how_3_title:  'ให้คะแนนและรีวิว',
    how_3_desc:   'หลังจากบริการเสร็จสิ้น แบ่งปันประสบการณ์ของคุณเพื่อช่วยผู้อื่น',

    // CTA
    cta_title:    'พร้อมที่จะเริ่มต้นแล้วหรือยัง?',
    cta_subtitle: 'เข้าร่วมกับลูกค้าที่พึงพอใจและผู้ให้บริการที่น่าเชื่อถือหลายพันราย',
    cta_btn1:     'เริ่มต้นฟรี',
    cta_btn2:     'เรียกดูบริการ',

    // Featured
    featured_title:    'บริการแนะนำ',
    featured_subtitle: 'บริการระดับสูงที่คัดสรรมาเพื่อคุณภาพ',
    featured_viewall:  'ดูทั้งหมด →',
    featured_explore:  'สำรวจบริการทั้งหมด →',
  },

  zh: {
    // Navbar
    nav_services:   '服务',
    nav_dashboard:  '仪表板',
    nav_signin:     '登录',
    nav_getstarted: '开始使用',
    nav_signout:    '退出登录',
    nav_profile:    '我的资料',
    nav_messages:   '消息',
    nav_myservices: '我的服务',
    nav_search_ph:  '搜索服务...',

    // Hero
    hero_badge:    '超过10,000名客户信赖',
    hero_title1:   '在您附近找到',
    hero_title2:   '值得信赖的本地服务',
    hero_subtitle: '在您所在地区与经过认证的专业服务提供商建立联系。立即预订，真实评价，完全信任。',
    hero_search_ph:'您在寻找什么服务？',
    hero_btn:      '搜索',
    hero_stat_svc: '项服务',
    hero_stat_pro: '位服务商',
    hero_stat_rat: '平均评分',

    // Categories
    cat_title:    '按类别浏览',
    cat_subtitle: '精确找到您所需的服务',

    // How it works
    how_title:    'ServiceHub 如何运作',
    how_1_title:  '搜索服务',
    how_1_desc:   '浏览数百种本地服务，按类别、位置、价格或评分筛选。',
    how_2_title:  '立即预订',
    how_2_desc:   '选择您偏好的日期和时间，为服务提供商添加特殊备注。',
    how_3_title:  '评分与评价',
    how_3_desc:   '服务完成后，分享您的体验，帮助其他用户做出选择。',

    // CTA
    cta_title:    '准备好开始了吗？',
    cta_subtitle: '加入数千名满意的客户和可信赖的服务提供商',
    cta_btn1:     '免费开始',
    cta_btn2:     '浏览服务',

    // Featured
    featured_title:    '精选服务',
    featured_subtitle: '为质量而精心挑选的顶级服务',
    featured_viewall:  '查看全部 →',
    featured_explore:  '探索所有服务 →',
  },
};

const LangContext = createContext(null);

export const LangProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem('sh_lang') || 'en');

  const changeLang = (code) => {
    setLang(code);
    localStorage.setItem('sh_lang', code);
  };

  const t = (key) => TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS['en'][key] ?? key;

  return (
    <LangContext.Provider value={{ lang, changeLang, t, languages: LANGUAGES }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
};
