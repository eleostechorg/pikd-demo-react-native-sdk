import type { PikdLocale } from '@eleostechorg/pikd-react-native-ui';
const copy = {
  ru: {
    appTitle: 'Демонстрация React Native-опыта PIKD',
    welcomeTitle:
      'Добро пожаловать на интерактивный рождественский маршрут {{partner}}!',
    experienceDescription:
      'Исследуйте рождественскую иллюминацию и найдите все 14 артефактов, чтобы выиграть приз. Самого быстрого участника ждёт особый приз. Один приз на человека, но проходить маршрут можно сколько угодно раз.',
    nicknameLabel: 'Никнейм (необязательно)',
    nicknamePlaceholder: 'Введите никнейм',
    openPikd: 'Открыть PIKD',
    configurationRequired: 'Требуется настройка',
    configurationDescription:
      'Скопируйте config/pikd.example.json в config/pikd.local.json и укажите:',
    experienceUnavailable: 'Опыт PIKD недоступен',
    singleActiveChallengeRequired:
      'PIKD можно открыть, когда для арендатора активен ровно один челлендж. Обратитесь в PIKD.',
    tryAgainLater: 'PIKD сейчас не удаётся открыть. Повторите попытку позже.',
    close: 'Закрыть',
    language: 'Язык',
  },
  kk: {
    appTitle: 'Демо React Native тәжірибесі PIKD',
    welcomeTitle: '{{partner}} интерактивті Рождество маршрутына қош келдіңіз!',
    experienceDescription:
      'Рождестволық жарықтарды тамашалап, жүлде ұтып алу үшін барлық 14 артефактті табыңыз. Ең жылдам қатысушыны ерекше жүлде күтеді. Әр адамға бір жүлде беріледі, ал маршрутты қалағаныңызша қайталауға болады.',
    nicknameLabel: 'Лақап ат (міндетті емес)',
    nicknamePlaceholder: 'Лақап атыңызды енгізіңіз',
    openPikd: 'PIKD ашу',
    configurationRequired: 'Конфигурация қажет',
    configurationDescription:
      'config/pikd.example.json файлын config/pikd.local.json ретінде көшіріп, мыналарды толтырыңыз:',
    experienceUnavailable: 'PIKD тәжірибесі қолжетімсіз',
    singleActiveChallengeRequired:
      'PIKD қызметін жалға алушы үшін дәл бір белсенді челлендж болғанда ашуға болады. PIKD компаниясына хабарласыңыз.',
    tryAgainLater: 'PIKD қазір ашылмады. Кейінірек қайталап көріңіз.',
    close: 'Жабу',
    language: 'Тіл',
  },
  en: {
    appTitle: 'PIKD React Native experience demo',
    welcomeTitle: "Welcome to {{partner}}'s Interactive Christmas Trail!",
    experienceDescription:
      'Explore the Christmas light displays and find all 14 artefacts to win a prize. The fastest to finish wins something extra special. One prize each, but run the trail as many times as you like.',
    nicknameLabel: 'Nickname (optional)',
    nicknamePlaceholder: 'Enter your nickname',
    openPikd: 'Open PIKD',
    configurationRequired: 'Configuration required',
    configurationDescription:
      'Copy config/pikd.example.json to config/pikd.local.json and provide:',
    experienceUnavailable: 'PIKD experience unavailable',
    singleActiveChallengeRequired:
      'PIKD can open when this tenant has exactly one active challenge. Please contact PIKD.',
    tryAgainLater: 'PIKD could not open right now. Please try again later.',
    close: 'Close',
    language: 'Language',
  },
} as const;
export function demoStrings(locale: PikdLocale, partnerLabel = 'CDA') {
  const localized = copy[locale];
  return {
    ...localized,
    welcomeTitle: localized.welcomeTitle.replace(
      '{{partner}}',
      () => partnerLabel,
    ),
  };
}
