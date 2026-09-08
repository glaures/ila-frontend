# Backend-Anforderung: Zuweisbare Kurse eines Schülers

Auf der Seite der manuellen Zuweisungen (`/admin/users/{userName}`) stehen unter den aktuellen
Kurszuweisungen die Kurse, die dem Kind noch zugewiesen werden könnten – je Wochentag gruppiert,
mit Belegung und einem „Zuweisen"-Knopf. Die Verwaltung soll beim Beheben eines
Belegungsproblems nicht raten müssen, welcher Kurs überhaupt in Frage kommt: Die Kurssuche
darüber durchsucht alle Kurse der Phase und prüft dabei keine einzige Regel.

**Status:** umgesetzt in `sandbox27.ila.backend.assignable.AssignableCoursesService` (Regelprüfung
in `CourseEligibilityService.checkManualAssignmentEligibility`, Tests in
`AssignableCoursesServiceTest`).

Das Frontend ruft den Endpoint in `pages/admin/users/[[username]].vue` auf. Fehlt er –
etwa gegen ein älteres Backend –, bleibt die Liste leer und die Seite meldet:
„Der Endpoint /users/{userName}/assignable-courses ist im Backend noch nicht verfügbar."

## Warum nicht im Frontend rechnen

Die Auswahl hängt an den Zuweisungsregeln: Klassenstufe, ausgeschlossene Geschlechter, für den
Schüler gesperrte Blöcke, persönliche Kursausschlüsse, ein Kurs je Wochentag, Kurskontingent je
Klassenstufe (`CourseQuota`), Belegungszahl je Kurs. Die Regeln im Frontend nachzubauen hieße, sie
ein zweites Mal zu pflegen – beim nächsten Regelwechsel laufen die Kopien auseinander. Die
Belegungszahlen stehen im Frontend ohnehin nicht zur Verfügung: `GET /assignments` liefert nur mit
`course-id` oder `user-name` Daten, die Liste würde also einen Request pro Kurs kosten.

## Endpoint

```
GET /users/{userName}/assignable-courses?period-id={periodId}
Authorization: Bearer <jwt>   // ADMIN oder Kursleiter
```

**Antwort:** `200 OK`, eine Liste, sortiert nach Wochentag, Startzeit und Kursname:

```json
[
  {
    "id": 42,
    "courseId": "K-042",
    "name": "Töpfern",
    "blockId": 12,
    "blockName": "Montag 14:00-15:30",
    "dayOfWeek": "MONDAY",
    "startTime": "14:00",
    "endTime": "15:30",
    "freeSeats": 3,
    "capacity": 20,
    "assignedSeats": 17,
    "assignable": true,
    "reason": null,
    "warning": null,
    "manualAssignmentOnly": false
  }
]
```

`404` bei unbekanntem Benutzer (`UserNotFound`) oder unbekannter Phase (`NotFound`).

`dayOfWeek` ist der Name der `DayOfWeek`-Konstante („MONDAY") und deshalb – wie in `BlockDto` –
als `String` deklariert: Ein Feld vom Typ `DayOfWeek` liefe in den global registrierten
`DayOfWeekSerializer` und käme als „Montag" an. Das Frontend sortiert und übersetzt Wochentage
selbst über `utils/weekdays` und braucht dafür die Konstanten.

## Welche Kurse in der Liste stehen

Nicht in der Liste (der Kurs kommt für dieses Kind grundsätzlich nicht in Frage – er würde die
Liste nur zumüllen):

* Klassenstufe des Kindes nicht zugelassen
* Geschlecht für den Kurs ausgeschlossen
* Block für dieses Kind gesperrt (`UserBlockExclusion`)
* persönlicher Kursausschluss (`CourseExclusion`)
* Platzhalter-Kurs
* Kurs ist dem Kind bereits zugewiesen
* Kurs ist noch keinem Block zugeordnet

In der Liste mit `assignable: false` und `reason` (die Verwaltung soll sehen, *warum* ein Kurs
nicht geht, statt ihn vergeblich zu suchen):

* Tageskonflikt – das Kind hat an diesem Wochentag schon einen Kurs
* Kurskontingent erreicht (drei Kurse, ab Klasse 11 zwei – siehe `CourseQuota`)

In der Liste mit `assignable: true`:

* alles Übrige, inklusive Kursen mit `manualAssignmentOnly` – die manuelle Zuweisung ist genau
  ihr Anwendungsfall. Im Wechselwunsch der Schüler bleiben sie weiterhin ausgeblendet.
* volle Kurse, mit `warning` statt Sperre: Ob überbucht wird, entscheidet die Verwaltung.
  `assignedSeats` bleibt ungekappt und zeigt damit auch bestehende Überbuchungen.

## Zuweisen

Der „Zuweisen"-Knopf ruft den bestehenden `POST /assignments` mit
`{ userName, courseId, periodId }` auf – `courseId` ist die fachliche Kennung, nicht die interne
`id`. Danach lädt die Seite Zuweisungen und zuweisbare Kurse gemeinsam neu, weil eine Zuweisung
die Tageskonflikte, das Kontingent und die Belegung der übrigen Kurse verändert. Die freie
Kurssuche darüber bleibt bestehen: Über sie lässt sich weiterhin jeder Kurs der Phase vergeben,
auch entgegen den Regeln.

## Nebenwirkung im Backend

`CourseEligibilityService` prüft seit dieser Änderung auch den persönlichen Kursausschluss
(`CourseExclusion`) – dieselbe Regel, mit der `CourseUserAssignmentService` eine Zuweisung
ablehnt. Das wirkt sich auch auf die Wechselwünsche aus: Dort standen bisher Kurse zur Auswahl,
die dem Kind nie zugeteilt werden konnten.
