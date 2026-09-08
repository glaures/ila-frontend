# Backend-Anforderung: Freie Plätze je Klassenstufe und Block

Für die Belegungsprobleme (`/admin/problems`) braucht die Seite eine Kreuztabelle: Zeilen sind die
Klassenstufen, Spalten die Blöcke, jede Zelle zeigt, wie viele Plätze einem Kind dieser Stufe in
diesem Block noch offenstehen. Damit lässt sich beim Beheben eines Problems sofort sehen, wo
überhaupt noch Platz ist. Die Spalte ist der Block und nicht der Wochentag, weil in Blöcke
eingeschrieben wird – an einem Tag kann es mehrere geben.

**Status:** umgesetzt in `sandbox27.ila.backend.freeseats.FreeSeatsService` (Abfrage in
`CourseBlockAssignmentRepository.findCourseGradeSeatsInPeriod`, Tests in `FreeSeatsServiceTest`).

Das Frontend ruft den Endpoint in `pages/admin/problems.vue` auf. Fehlt er – etwa gegen ein
älteres Backend –, bleibt die Tabelle leer und die Seite meldet:
„Der Endpoint /periods/{id}/free-seats ist im Backend noch nicht verfügbar."

## Warum nicht im Frontend rechnen

Kapazität und Klassenstufen stehen zwar in `GET /courses?period-id=…` (`maxAttendees`, `grades`,
`block.dayOfWeek`), die Belegungszahl aber nicht. `GET /assignments` liefert nur mit `course-id`
oder `user-name` Daten – mit `period-id` allein kommt eine leere Liste zurück
(`CourseUserAssignmentService.getCourseUserAssignment`). Die Tabelle würde also einen Request pro
Kurs kosten.

## Endpoint

```
GET /periods/{periodId}/free-seats
Authorization: Bearer <jwt>   // ADMIN
```

Keine Query-Parameter.

**Antwort:** `200 OK`, eine flache Liste – ein Eintrag je Kombination aus Klassenstufe und Block,
für die es mindestens einen Kurs gibt:

```json
[
  {
    "grade": 5,
    "blockId": 12,
    "dayOfWeek": "MONDAY",
    "startTime": "14:00",
    "endTime": "15:30",
    "freeSeats": 42,
    "capacity": 120,
    "assignedSeats": 78,
    "courseCount": 6
  }
]
```

| Feld            | Typ    | Bedeutung                                                              |
|-----------------|--------|------------------------------------------------------------------------|
| `grade`         | number | Klassenstufe, `99` = Vorklasse (wie in `CourseDto.grades`)              |
| `blockId`       | number | Block, auf den sich die Zelle bezieht                                   |
| `dayOfWeek`     | string | `MONDAY` … `SUNDAY`, wie in `BlockDto.dayOfWeek`                        |
| `startTime`     | string | `HH:mm`, wie in `BlockDto`                                              |
| `endTime`       | string | `HH:mm`, wie in `BlockDto`                                              |
| `freeSeats`     | number | freie Plätze, siehe Zählweise unten                                    |
| `capacity`      | number | Summe der `maxAttendees` der gezählten Kurse                            |
| `assignedSeats` | number | Summe der vergebenen Plätze der gezählten Kurse                         |
| `courseCount`   | number | Anzahl der gezählten Kurse                                              |

Tag und Zeiten wiederholen sich in jeder Zelle desselben Blocks – so kommt die Tabelle ohne einen
zweiten Aufruf von `/blocks` aus.

`capacity`, `assignedSeats` und `courseCount` braucht die Tabelle nur für den Tooltip einer Zelle;
sie sind aus derselben Abfrage ohnehin da. Kombinationen ohne Kurse dürfen fehlen – das Frontend
leitet Zeilen und Spalten aus den gelieferten Einträgen ab und zeigt fehlende Zellen als „–".

## Zählweise

Gezählt werden die Kurse der Phase, die an diesem Block hängen und deren `grades` die
Klassenstufe enthalten.

```
freeSeats = Σ max(0, course.maxAttendees − Zuweisungen(course))
```

Vier Entscheidungen, die das Ergebnis prägen:

- **Pro Kurs bei 0 abschneiden.** Sonst würde ein überbuchter Kurs freie Plätze anderer Kurse
  auffressen und die Zelle zu niedrig ausweisen. `assignedSeats` bleibt ungekappt, damit die
  Überbuchung im Tooltip trotzdem sichtbar ist.
- **Mehrfachzählung ist gewollt.** Ein Kurs für die Stufen 5–7 taucht in allen drei Zeilen mit
  seinen freien Plätzen auf. Die Zelle beantwortet „wie viele Plätze stehen einem Kind dieser Stufe
  in diesem Block offen", nicht „wie viele Plätze existieren insgesamt". Die Spalten dürfen deshalb
  **nicht** über die Stufen aufsummiert werden – das Frontend zeigt aus demselben Grund nur eine
  Zeilensumme über die Woche.
- **Ausgenommen:** Kurse ohne Block, Kurse mit `placeholder = true`, Kurse mit
  `manualAssignmentOnly = true` und Kurse ohne Klassenstufe. Der Filter auf
  `manualAssignmentOnly` hält die Übersicht deckungsgleich mit dem, was
  `CourseAssignmentService.assignCourses` überhaupt belegen kann; letztere lassen sich keiner
  Zeile zuordnen.

Nicht berücksichtigt werden `excludedGenders` und die nutzerbezogenen `CourseExclusion`-Einträge:
beide hängen am einzelnen Kind, nicht an der Klassenstufe. Die Zahl ist damit eine Obergrenze.

## Fehler

| Situation               | HTTP | `code`         |
|-------------------------|------|----------------|
| kein/abgelaufenes Token | 401  | –              |
| Aufrufer ist kein Admin | 403  | `RoleRequired` |
| Phase existiert nicht   | 404  | `NotFound`     |
