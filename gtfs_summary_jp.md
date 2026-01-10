# GTFS (General Transit Feed Specification) ファイル概要

GTFS（標準的なバス情報フォーマット）を構成する主要なファイルと、その変数の日本語・英語対応表です。

## 必須ファイル

### 1. agency.txt (事業者情報)
運行事業者に関する基本情報です。

| 変数名 | 日本語名 | 必須 | 説明 |
| :--- | :--- | :--- | :--- |
| `agency_id` | 事業者ID | 条件付 | データセット内で一意のID。 |
| `agency_name` | 事業者名称 | **必須** | 例: 東京都交通局 |
| `agency_url` | 事業者URL | **必須** | 事業者の公式ウェブサイトURL。 |
| `agency_timezone` | タイムゾーン | **必須** | 例: Asia/Tokyo |
| `agency_lang` | 言語 | 条件付 | 例: ja |

### 2. stops.txt (停留所情報)
バス停や駅の個別の位置情報です。

| 変数名 | 日本語名 | 必須 | 説明 |
| :--- | :--- | :--- | :--- |
| `stop_id` | 停留所ID | **必須** | システム内で一意のID。 |
| `stop_code` | 停留所コード | 任意 | ユーザー向けに表示される番号・記号。 |
| `stop_name` | 停留所名称 | **必須** | 例: 渋谷駅前 |
| `stop_lat` | 緯度 | **必須** | WGS84座標系。 |
| `stop_lon` | 経度 | **必須** | WGS84座標系。 |
| `location_type` | ロケーションタイプ | 任意 | 0:停留所(デフォルト), 1:駅/ターミナル |
| `parent_station` | 親駅ID | 条件付 | location_type=0の場合、所属する駅のID。 |

### 3. routes.txt (経路情報)
運行系統（路線）の情報です。

| 変数名 | 日本語名 | 必須 | 説明 |
| :--- | :--- | :--- | :--- |
| `route_id` | 経路ID | **必須** | 系統を一意に識別するID。 |
| `agency_id` | 事業者ID | 条件付 | agency.txtのIDと紐付け。 |
| `route_short_name` | 経路略称 | **必須*** | 例: 都01 (shortかlongのどちらか必須) |
| `route_long_name` | 経路正式名称 | **必須*** | 例: 渋谷〜六本木〜新橋 |
| `route_type` | 経路タイプ | **必須** | 3: バス, 0: 路面電車, 1: 地下鉄, 2: 鉄道 |
| `route_color` | 路線色 | 任意 | RGB 16進数 (例: FF0000) |
| `route_text_color` | 文字色 | 任意 | 路線名表示の文字色 (例: FFFFFF) |

### 4. trips.txt (便情報)
1回の運行（便）ごとの情報です。

| 変数名 | 日本語名 | 必須 | 説明 |
| :--- | :--- | :--- | :--- |
| `route_id` | 経路ID | **必須** | 所属する路線のID。 |
| `service_id` | サービスID | **必須** | 運行日パターンID (calendar.txtと紐付け)。 |
| `trip_id` | 便ID | **必須** | この便を一意に識別するID。 |
| `trip_headsign` | 行き先表示 | 任意 | 例: 新橋駅前 行き |
| `direction_id` | 上下区分 | 任意 | 0: 往路, 1: 復路 (定義は事業者による) |
| `shape_id` | 描画ID | 任意 | 地図上の描画形状ID (shapes.txtと紐付け)。 |

### 5. stop_times.txt (通過時刻情報)
各便がどの停留所に何時に発着するかを定義します。データ量が最も多いファイルです。

| 変数名 | 日本語名 | 必須 | 説明 |
| :--- | :--- | :--- | :--- |
| `trip_id` | 便ID | **必須** | trips.txtのID。 |
| `arrival_time` | 到着時刻 | **必須** | HH:MM:SS (24時を超える場合は25:00:00等)。 |
| `departure_time` | 出発時刻 | **必須** | 通常は到着時刻と同じか、発車待ちがあれば遅くなる。 |
| `stop_id` | 停留所ID | **必須** | stops.txtのID。 |
| `stop_sequence` | 停車順序 | **必須** | 1からの連番など。順序通りに並んでいる必要がある。 |
| `pickup_type` | 乗車区分 | 任意 | 0:通常, 1:乗車不可 |
| `drop_off_type` | 降車区分 | 任意 | 0:通常, 1:降車不可 |

### 6. calendar.txt / calendar_dates.txt (運行日)
どの便（service_id）がいつ運行するかを定義します。

**calendar.txt (曜日パターン)**
| 変数名 | 日本語名 | 必須 | 説明 |
| :--- | :--- | :--- | :--- |
| `service_id` | サービスID | **必須** | |
| `monday`...`sunday` | 曜日フラグ | **必須** | 1:運行, 0:運休 |
| `start_date` | 開始日 | **必須** | YYYYMMDD |
| `end_date` | 終了日 | **必須** | YYYYMMDD |

**calendar_dates.txt (例外日)**
特定の祝日や運休設定に使用します。
| 変数名 | 日本語名 | 必須 | 説明 |
| :--- | :--- | :--- | :--- |
| `service_id` | サービスID | **必須** | |
| `date` | 日付 | **必須** | YYYYMMDD |
| `exception_type` | 例外区分 | **必須** | 1:追加運行, 2:運休 |

## 任意のファイル（一部）

### shapes.txt (描画形状)
地図上でルートを正確に描画するための点列データです。

| 変数名 | 日本語名 | 必須 | 説明 |
| :--- | :--- | :--- | :--- |
| `shape_id` | 描画ID | **必須** | trips.txtと紐付け。 |
| `shape_pt_lat` | 緯度 | **必須** | |
| `shape_pt_lon` | 経度 | **必須** | |
| `shape_pt_sequence` | 順序 | **必須** | 点をつなぐ順序。 |
| `shape_dist_traveled` | 走行距離 | 任意 | 起点からの距離。 |

### fare_attributes.txt / fare_rules.txt (運賃)
運賃計算ルールを定義します。
- `price`: 金額
- `currency_type`: 通貨 (JPY)
- `payment_method`: 支払い方法 (0:乗車時, 1:乗車前)
- `transfers`: 乗換回数制限
