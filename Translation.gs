const TRANSLATIONS = {
  pl: {
    appTitle: 'Aplikacja do zapisów',

    configError:
      'Błąd konfiguracji dat zapisów w zakładce "ustawienia": {from} - {to}.',

    registrationOpen:
      'Zapisy będą dostępne od: {date}',

    registrationClosed:
      'Zapisy zostały zakończone.',

    limitExceeded:
      '❌ Limit miejsc przekroczony! Dostępne: 0/{max}',

    activityNotFound:
      'Błąd: nie znaleziono zajęcia.',

    classNotAllowed:
      'Błąd: klasa ucznia nie jest uprawniona do tych zajęć.',

    conflict:
      'Błąd: dziecko {student} jest już zapisane na to zajęcie lub ma kolizję czasową.',

    registered:
      '✅ Dziecko {student} zapisano na zajęcia {activity}.',

  /*  monday: 'Poniedziałek',
    tuesday: 'Wtorek',
    wednesday: 'Środa',
    thursday: 'Czwartek',
    friday: 'Piątek'*/
  },

  en: {
    appTitle: 'Registration Application',

    configError:
      'Registration dates configuration error in sheet "ustawienia": {from} - {to}.',

    registrationOpen:
      'Registration will be available from: {date}',

    registrationClosed:
      'Registration has been closed.',

    limitExceeded:
      '❌ Capacity exceeded! Available: 0/{max}',

    activityNotFound:
      'Error: activity not found.',

    classNotAllowed:
      'Error: student class is not eligible for this activity.',

    conflict:
      'Error: student {student} is already registered or has a schedule conflict.',

    registered:
      '✅ Student {student} has been registered for {activity}.',

    /*monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday'*/
  }
};


function t(lang, key, params = {}) {

  let text =
    TRANSLATIONS[lang]?.[key]
    || TRANSLATIONS.pl?.[key]
    || key;

  Object.keys(params).forEach(p => {
    text = text.replaceAll(`{${p}}`, params[p]);
  });

  return text;
}
