# Storage lifetime e backup completo

La persistenza mobile usa un singolo database SQLite locale tramite Expo SQLite. Le sessioni restano righe compatte e indicizzate; gli aggregati lifetime vengono aggiornati nella stessa transazione con WAL e `synchronous=FULL`. La timeline dell’interfaccia legge soltanto le ultime 120 righe, mentre il backup esporta tutte le righe senza un limite applicativo.

Il ripristino crea prima uno snapshot del database corrente e registra due livelli di journal persistente: uno per il rollback SQLite e uno per il commit coordinato di profilo, personalizzazioni, preferenze e premi. Un token scritto atomicamente nel database decide al bootstrap se completare il nuovo stato o ripristinare quello precedente. Una barriera applicativa accoda le sessioni BLE/manuali che arrivano durante il restore, così vengono salvate subito dopo senza essere sovrascritte. Se la copia, la validazione o il processo vengono interrotti, lo stato coerente viene recuperato al prossimo avvio. Un backup nato da un vecchio codice v2 conserva gli aggregati lifetime originali e viene marcato `historyComplete=false`: i progressi non vengono azzerati, mentre l’app dichiara onestamente quante righe storiche erano contenute nel vecchio formato.

Fonti ufficiali consultate:

- Expo SQLite SDK 54: https://docs.expo.dev/versions/v54.0.0/sdk/sqlite/ — `openDatabaseAsync`, WAL, query parametrizzate e transazioni esclusive.
- Expo FileSystem SDK 54: documentazione locale `/home/ubuntu/sparkly-brush_helper/docs/storage/filesystem/DOCS.md` — file nel sandbox, stream/FileHandle e file temporanei in cache.
- Expo Sharing SDK 54: documentazione locale `/home/ubuntu/sparkly-brush_helper/docs/communication/sharing/DOCS.md` — condivisione di file locali su iOS/Android.
- Expo DocumentPicker SDK 54: documentazione locale `/home/ubuntu/sparkly-brush_helper/docs/storage/document-picker/DOCS.md` — selezione di file con `copyToCacheDirectory: true` per lettura immediata.

Il backup completo sarà un file versionato condivisibile. Il formato precedente a codice resterà importabile per retrocompatibilità, ma i backup nuovi non saranno troncati a 120 sessioni.
