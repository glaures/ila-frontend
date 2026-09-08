# Backend-Anforderung: Excel-Export der Kurse einer Phase

Gegenstück zum Excel-Import (`docs/frontend-course-import.md`). Zweck: aus den Kursen einer
bestehenden Phase eine **Startdatei für die nächste Phase** erzeugen, die ohne Nachbearbeitung des
Spaltenlayouts wieder über `POST /imports/courses/validate` eingelesen werden kann.

Das Frontend ruft den Endpoint bereits auf – siehe `composables/useCourseExport.ts` und
`pages/admin/kurs-liste.vue`. Solange er fehlt, meldet die Seite:
„Der Export-Endpoint /exports/courses ist im Backend noch nicht verfügbar."

## Endpoint

```
GET /exports/courses?period-id={periodId}
Authorization: Bearer <jwt>   // ADMIN
```

| Param                  | Typ     | Pflicht | Bedeutung                                              |
|------------------------|---------|---------|--------------------------------------------------------|
| `period-id`            | number  | ja      | Quellphase, deren Kurse exportiert werden               |
| `exclude-placeholders` | boolean | nein    | `true` = Kurse mit `placeholder=true` weglassen         |
| `only-with-block`      | boolean | nein    | `true` = nur Kurse exportieren, die einem Block hängen  |

**Antwort:** `200 OK`

```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="kurs-vorlage-<phase>.xlsx"
```

Body = die `.xlsx`-Datei. Das Frontend lädt sie als Blob und benennt die Datei selbst; der
`Content-Disposition`-Header ist also optional, aber für direkte Aufrufe sinnvoll.

Fehler analog zum Import: `403 RoleRequired`, `404 NotFound` (Phase existiert nicht), `500`.

## Entscheidend: Spaltenlayout aus derselben Quelle wie der Import

Der Grund für den Endpoint (statt einer Generierung im Frontend) ist, dass Export und Import nicht
auseinanderlaufen dürfen. Die Kopfzeile sollte deshalb aus derselben Konstanten/Enum-Definition
kommen, die der Parser in `sandbox27.ila.backend.imports` zum Erkennen der Spalten benutzt – nicht
aus einer zweiten, handgepflegten Liste.

Rückkonvertierung der Werte in die Excel-Schreibweise (spiegelbildlich zum Import):

| Feld            | Datenbank / DTO                       | Excel                                   |
|-----------------|----------------------------------------|-----------------------------------------|
| Block           | `block.dayOfWeek`, `block.startTime`   | `Wochentag` („Montag") + `Zeitschiene` („11:20:00") |
| Klassenstufen   | `grades: number[]`, VK = `99`          | Stufenliste, `99` → `VK`                |
| Kategorien      | `courseCategories: string[]`           | Codes wie beim Import (`iLa`, `KuP`, `BuE`, `FuF`, `SOL`) |
| Kursleiter      | `instructor: UserDto`                  | Vorname + Nachname in getrennten Spalten (keine E-Mail) |
| Kurs-ID         | `courseId`                             | unverändert – trägt die `CREATE`/`UPDATE`-Entscheidung beim Re-Import |

Kurse ohne Block bzw. ohne Kursleiter werden mit leeren Zellen exportiert (der Import meldet sie
dann als Fehlerzeile, was hier genau richtig ist: die Lücke soll in der Vorlage sichtbar bleiben).

## Round-Trip als Test

Sinnvoller Integrationstest: Export einer Phase → dieselbe Datei an `POST /imports/courses/validate`
mit derselben `period-id` → der Report muss `importable === true` liefern und für jede Zeile
`action === "UPDATE"` (keine `CREATE`, keine `SKIP`). Damit ist bewiesen, dass beide Seiten dasselbe
Layout sprechen.

## Nicht Teil des Exports

Zuweisungen, Präferenzen und Teilnehmerlisten – die Vorlage beschreibt ausschließlich das
Kursangebot. Für die Belegungssicht gibt es `/admin/belegungen`.
