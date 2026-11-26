---
type: project-artifact
status: draft
provenance: ai-assisted
reviewed: false
created: 2026-11-25
---
# Middle System Analyst — 30-day Interview Intensive

Цель: за месяц интенсивно подготовиться к типовым Middle System Analyst интервью, используя имеющийся опыт frontend. Это отдельный трек, не замена [[Interview Preparation Plan]]. Цель — техническая готовность, не гарантия оффера или коммерческого грейда.

## Как пользоваться

- 30 учебных дней, ориентир 3–4 часа в день. Это планируемая нагрузка, не обещание результата. Дни 6, 12, 18, 28–30 — контроль и резерв для пробелов.
- Обычный день: 45–60 мин теория, 90–120 мин самостоятельная практика, 20–30 мин SQL/повторение, 15–20 мин устные ответы. Видео заменяет часть чтения, а не добавляется сверху.
- Дни 2–12: SQL-практика по указанным урокам встроена в дневной бюджет. В следующие дни возвращаться к ошибочным запросам. На контрольных днях допускается сокращённая нагрузка.
- Отмечать чекбокс, только если выполнен соответствующий результат. Знакомую теорию можно пропустить после успешной проверки без подсказок; практику не пропускать. Не создавать отдельный трекер.
- Практика: один небольшой Order Management кейс в [[SA Practice Lab]], затем незнакомые задачи. Оценка: [[SA Interview Scorecard]]. Не строить полноценный backend/frontend.
- Если застрял на настройке инструмента больше 30 минут, перейти к браузерному тренажёру/схеме на бумаге и вернуться к настройке в резерв. SQL-конкурентность всё же проверить в двух сессиях PostgreSQL до финала.
- Не откладывать поиск работы до дня 30: начинать отклики и реальные интервью параллельно. Результаты интервью корректируют оставшиеся учебные дни.

## Карта месяца

| Дни | Блок | Обязательный результат |
|---|---|---|
| 1 | Диагностика | Пробелы + реальные рабочие истории |
| 2–6 | Требования и SDLC | SRS-lite, сценарии, критерии приёмки |
| 7–12 | API и интеграции | OpenAPI, реальные запросы, маппинг |
| 13–18 | SQL и данные | ERD, запросы, транзакционный эксперимент |
| 19–21 | Моделирование | Sequence, State, BPMN |
| 22–24 | Брокеры | Контракт события и обработка отказов |
| 25–27 | Архитектура и сопровождение | C4, NFR, безопасность, постановка |
| 28–30 | Интервью | 2 полноценных mock + повтор ошибок |

## День 01 — диагностика

- [ ] Прочитать [гайд Сбера](https://developers.sber.ru/kak-v-sbere/interview/sa-developer): этапы технического интервью и рекомендации. Понять формат: теория, кейс, обсуждение опыта. Достаточно беглого чтения, если формат понятен; не нужно конспектировать.
- [ ] Быстрая диагностика: открыть [[SA Practice Lab#Диагностика без подготовки]], попробовать 6 задач (всего 20–30 минут). На каждую — 2–3 минуты своими словами, затем при необходимости открыть подсказку и попробовать ещё 1–2 минуты. Если не знаешь — записать «не знаю» и перейти дальше. Отметить исходный уровень до подсказки в Scorecard; 0–1 — нормальный старт. Чекбокс означает, что диагностика пройдена, а не что все задачи решены.
- [ ] Подготовить черновик самопрезентации на 60–90 секунд: опыт frontend, реальные задачи с API/QA/требованиями, причина перехода. Выбрать 2–3 реальные рабочие истории, не выдумывать опыт аналитика.
- [ ] Открыть [SQLBolt](https://sqlbolt.com/), решить Lesson 1; подготовить папку для собственных учебных артефактов (не создавать второй roadmap).

**Если диагностика показала много нулей:** не пытайся закрыть пробелы в день 01. Переходи к дню 02 и изучай последовательно. Основная работа — в Wiki; чат нужен для уточнений, подсказок и проверки твоих ответов. Не нужно сначала уметь решать все кейсы, чтобы начать учиться.

## Блок 1. Требования — дни 02–06

Две книги на выбор, не читать обе подряд: **Wiegers & Beatty, Software Requirements, 3rd edition** ([оглавление с названиями подразделов](https://www.oreilly.com/library/view/software-requirements-3rd/9780735679658/index.html), [издатель](https://www.microsoftpressstore.com/store/software-requirements-9780735679610)); или **бесплатный [IREB Foundation Level Handbook v1.3.2 EN](https://cpre.ireb.org/en/downloads-and-resources/downloads#cpre-foundation-level-handbook)**. Для IREB ниже указаны конкретные разделы/страницы этого издания. Номера страниц Вигерса зависят от перевода — ориентироваться по подразделам. Не нужна сертификация и не нужно читать всю книгу.

### День 02 — роль аналитика, виды требований

- [ ] Вигерс гл. 1: software requirements defined; levels and types; requirements development and management. Альтернатива IREB §1.1–1.5 (стр. 10–14), §2.2.2 и §2.2.4–2.2.5. Различать бизнес-/пользовательские/функциональные требования, quality attributes, ограничения; SA vs BA vs developer; elicitation/analysis/specification/validation/management.
- [ ] Карта банкоматов: написать бизнес-цель, 2 user needs, 3 FR, 3 измеримых NFR, 2 ограничения; отдельно пометить допущения.
- [ ] SQLBolt Lessons 2–3: WHERE, AND/OR, IN, LIKE; выполнить интерактивные упражнения.
- [ ] Вслух: что такое требование, FR vs NFR, почему «кэш на 10 минут» не равно требованию актуальности.

### День 03 — выявление требований и scope

- [ ] Вигерс гл. 5 — vision/scope; гл. 7 — elicitation techniques, interviews. Альтернатива IREB §4.1.1–4.1.3 и §4.2.2; выборочно §4.3.1 (лимит 45–60 минут на чтение). [Laura Brandenburg — вопросы при elicitation](https://www.bridging-the-gap.com/what-questions-do-i-ask-during-requirements-elicitation/) — видео или текст вместо части чтения.
- [ ] Lab A: интервью с «заказчиком», минимум 8 уточнений; actors/stakeholders, in/out of scope, assumptions, 3 открытых вопроса. Разрешить конфликт резерва склада и бизнеса; обозначить владельца решения. Кратко AS-IS/TO-BE.
- [ ] SQLBolt Lesson 4 и Review: DISTINCT, ORDER BY, LIMIT; минимум 3 запроса без подсказок.
- [ ] Вслух: методы сбора, что делать с противоречием, как отличить проблему от готового решения.

### День 04 — Use Case, User Story, business rules

- [ ] Вигерс гл. 8: use cases and user stories; pre/postconditions; normal/alternative/exception flows; include/extend; гл. 9: business rules and requirements. Альтернатива IREB §3.3.1–3.3.2 (стр. 42–45) и §3.4.2/3.4.4 выборочно; сверить User Story и Use Case в [System Analyst Space](https://system-analyst.space/introduction/roadmap-start-here/) в разделе «Работа с требованиями».
- [ ] Lab A: 2 Use Case (создание заказа, оплата), 4–6 бизнес-правил, 2 User Story в формате role/goal/benefit. Проверить INVEST, 6 критериев Given/When/Then; сценарии отказа и повторной операции.
- [ ] SQLBolt Lesson 6: INNER JOIN; объяснить, почему появляются дубли.
- [ ] Вслух: Use Case vs User Story vs Use Case Diagram; precondition vs postcondition; acceptance criteria vs требования.

### День 05 — качественные требования и документация

- [ ] Вигерс гл. 10: SRS template и labeling; гл. 11: characteristics of excellent requirements; гл. 14: software quality attributes (производительность, доступность, безопасность, usability). Альтернатива IREB §3.1.2–3.1.5, §3.6, §3.8 (стр. 34–39, 71–75).
- [ ] Lab A: собрать SRS-lite: scope, 8–12 FR с ID, 3–5 NFR с условиями и измерением, business rules, use cases, assumptions, acceptance criteria. Пройти ревью на однозначность, проверяемость, непротиворечивость.
- [ ] SQLBolt Lessons 7–8: LEFT/OUTER JOIN, NULL. Решить anti-join: клиенты без заказов.
- [ ] Вслух: что такое SRS/ТЗ, атомарность, критерий качества; P95 и доступность на примере без углубления в расчёты.

### День 06 — SDLC и контроль требований

- [ ] [Scrum Guide](https://scrumguides.org/scrum-guide.html): Scrum Team, Events, Artifacts, Definition of Done; Вигерс гл. 17 — validation/acceptance criteria, гл. 28–29 — impact analysis/traceability (или IREB §4.4.1–4.4.2, §6.6–6.8, стр. 141–146 выборочно). [System Analyst Space](https://system-analyst.space/introduction/roadmap-start-here/) — ссылки «SDLC», «Методологии разработки», «Приоритезация требований», «Инструменты аналитика»; читать только соответствующие определения. Понимать SDLC, Scrum vs Kanban, Jira vs Confluence, MoSCoW, verification vs validation.
- [ ] Новый кейс: карта банкоматов/смена номера — 5 уточнений, 3 FR/3 NFR, один Use Case с веткой; затем изменить одно требование и назвать затронутые артефакты.
- [ ] SQLBolt Lessons 9–10: expressions, COUNT/SUM/AVG; минимум 3 запроса.
- [ ] Gate 1: устный mini-mock из Requirements-вопросов Scorecard без подсказок; исправить 1–2 пробела. Отметить gate лишь после самостоятельного решения.

## Блок 2. API — дни 07–12

### День 07 — HTTP и JSON

- [ ] [MDN HTTP Overview](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview): components, HTTP flow, messages; [HTTP methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Methods) — GET/POST/PUT/PATCH/DELETE, safe/idempotent; [status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status) — 200/201/202/204, 400/401/403/404/409/422/429, 500/502/503/504. DNS/TLS на уровне назначения, HTTP vs HTTPS; заголовки Content-Type/Accept/Authorization.
- [ ] [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259.txt) §§3–5: шесть JSON values; отличие null, пустой строки, отсутствующего поля; дата/UUID не самостоятельные JSON-типы. На бумаге записать один HTTP request/response с JSON.
- [ ] SQLBolt Lesson 11–12: GROUP BY, HAVING, порядок выполнения; 3 запроса.
- [ ] Вслух: 401 vs 403, PUT vs PATCH, POST после timeout, идемпотентность vs безопасность метода.

### День 08 — REST и проектирование операций

- [ ] [Microsoft REST API design](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design): REST principles, resources/URIs, HTTP methods, filtering/pagination, versioning; не читать advanced HATEOAS examples. Сформулировать 6 REST constraints (client-server, stateless, cacheable, uniform interface, layered system, optional code-on-demand).
- [ ] Lab B: на бумаге 5 операций create/get/list/cancel заказа и создание payment attempt. Для каждой — path/query/body, status, 1 ошибка; фильтр, сортировка и пагинация. Повтор запроса с тем же и изменённым idempotency key.
- [ ] SQLBolt Lessons 13–14: INSERT/UPDATE; проверить WHERE.
- [ ] Вслух: resource vs endpoint; REST vs RPC; stateless; как не сломать существующего клиента.

### День 09 — OpenAPI

- [ ] Swagger OAS 3.0: [Basic Structure](https://swagger.io/docs/specification/v3_0/basic-structure/), [Parameters](https://swagger.io/docs/specification/v3_0/describing-parameters/), [Request Body](https://swagger.io/docs/specification/v3_0/describing-request-body/describing-request-body/), [Responses](https://swagger.io/docs/specification/v3_0/describing-responses/) — только базовые примеры JSON, required, schema, components/$ref; [Authentication](https://swagger.io/docs/specification/v3_0/authentication/) — securitySchemes и Bearer; не читать multipart/serialization details. Выбрать OAS 3.0.3 для учебного файла, не смешивать с 3.1 nullable.
- [ ] Lab B: описать 5 операций в openapi.yaml, включая общий error object, request/response examples, security scheme, required/nullable. Вставить в [Swagger Editor](https://editor.swagger.io/) и устранить ошибки валидатора.
- [ ] SQLBolt Lessons 15–16: DELETE/CREATE TABLE. Вслух объяснить DDL/DML/TCL.
- [ ] Gate дня: могу вручную добавить эндпоинт, не копируя целиком готовый контракт.

### День 10 — Postman и проверка контракта

- [ ] [Postman Quick Start](https://learning.postman.com/docs/getting-started/quick-start/): send a request, inspect response, save collection; [Prism](https://github.com/stoplightio/prism) — README quickstart, если доступен Node.js. Настройка не более 30 мин.
- [ ] Отправить 6 запросов к своему mock (или публичному демонстрационному API для освоения клиента): успех, неверные данные, не найдено, повтор, конфликт, отсутствие авторизации. Для mock при необходимости выбрать пример ответа по коду ([Prism CLI](https://github.com/stoplightio/prism/blob/main/docs/getting-started/03-cli.md) поддерживает Prefer: code=...). Если демонстрационный API не поддерживает конкретную ошибку, описать её как ожидаемый тест, не выдавать за исполненный. Если mock симулирует только схемы/ответы, явно отметить, что бизнес-права, реальный эффект повторов и persistence не проверены. Сохранить коллекцию и 3 фактических результата. Не отправлять секреты/реальные данные.
- [ ] SQLBolt [Subqueries](https://sqlbolt.com/topic/subqueries) — один подзапрос; PGExercises Basic — одно упражнение на CASE.
- [ ] Вслух: Swagger/OpenAPI vs Postman, контрактное vs функциональное тестирование, что проверяет mock.

### День 11 — SOAP / XML / data mapping

- [ ] [MDN XML introduction](https://developer.mozilla.org/en-US/docs/Web/XML/Guides/XML_introduction) — well-formed XML, tags/attributes; [SOAP 1.2 Primer](https://www.w3.org/TR/soap12-part0/) §§2.1, 2.3 — Envelope/Header/Body/Fault; [WSDL primer](https://www.w3.org/TR/wsdl20-primer/) §2 overview/example — service/interface/binding/endpoint, роль XSD. Не читать всю спецификацию. [JSON Schema object](https://json-schema.org/understanding-json-schema/reference/object) — properties/required/additionalProperties.
- [ ] Lab B2: таблица маппинга внешнего платежа → внутренний объект с типами, required/null, преобразованиями и ошибками; нарисовать SOAP request/response/Fault и преобразование в JSON. Проверить 4 негативных случая.
- [ ] PGExercises [Basic](https://pgexercises.com/questions/basic/) — Combining results from multiple queries (UNION), повторить UNION ALL.
- [ ] Вслух: SOAP vs REST, WSDL vs XSD, JSON vs XML, почему неизвестный внешний статус нельзя считать SUCCESS.

### День 12 — интеграции и контроль API

- [ ] [System Design Primer](https://github.com/donnemartin/system-design-primer) раздел Communication (HTTP/RPC/REST); [System Analyst Space](https://system-analyst.space/introduction/roadmap-start-here/) раздел интеграций — открыть только Webhook, Webhook vs Polling, WebSocket, gRPC vs REST; [MDN SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) — введение. GraphQL, ESB/BFF — назначение одной фразой. Для основных способов: что это, кто инициирует обмен, типичный use case. Различать sync/async, polling/webhook, timeout/retry.
- [ ] Новый кейс: бронирование номера, API create/get/cancel; определить, что происходит при timeout и повторе POST. Добавить callback об оплате и объяснить выбор вместо polling.
- [ ] PGExercises [Joins and Subqueries](https://pgexercises.com/questions/joins/) — первые 2 задачи.
- [ ] Gate 2: 8–12 API-вопросов Scorecard без повтора, 1 незнакомый API drill с ошибками и маппингом; без готового решения. Исправить пробелы.

## Блок 3. Данные и SQL — дни 13–18

С этого момента SQL на настоящем PostgreSQL: локальный Docker/существующая БД ([официальная установка](https://www.postgresql.org/docs/current/tutorial-install.html), краткий вариант с Docker в Lab C); только учебные данные. Если среда не готова, сначала PGExercises в браузере, затем резерв на установку. Книга EN: [Database Design – 2nd Edition](https://opentextbc.ca/dbdesign01/) — открытый учебник, главы указаны ниже.

### День 13 — модель данных, ключи, связи

- [ ] Database Design главы 7–10: из 7 — relation/keys, из 8 и 10 — ER relationships/cardinality/optional participation, из 9 — integrity. [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html) §§CHECK, NOT NULL, UNIQUE, PK, FK; не читать exclusion constraints.
- [ ] Lab C: ERD customers/products/orders/order_items/payments. Подписать PK/FK, 1:1/1:N/M:N, обязательность, data types (int, text, numeric, date/timestamp), цену покупки vs текущую цену. Написать свой DDL перед сравнением с fixture.
- [ ] Запустить SQL fixture Lab C в PostgreSQL; проверить 5 таблиц, сделать BEGIN → INSERT/UPDATE → ROLLBACK на тестовой записи и SELECT для проверки.
- [ ] Вслух: PK vs UNIQUE vs FK, composite key, логическая vs физическая модель.

### День 14 — нормализация и типы БД

- [ ] Database Design главы 11 (functional dependencies) и 12 (1NF, 2NF, 3NF, anomalies). [System Design Primer](https://github.com/donnemartin/system-design-primer) Database — RDBMS vs NoSQL. Понимать PostgreSQL, MongoDB, Redis, Cassandra, Neo4j; ClickHouse — колоночная аналитическая СУБД, OLTP/OLAP; нормализация vs денормализация.
- [ ] На одной плохой таблице заказов показать аномалии вставки/обновления/удаления и нормализовать до 3NF; объяснить, почему full_name сам по себе не нарушение 1NF.
- [ ] PGExercises Joins and Subqueries — задачи 3–5 (recommenders/tennis courts); минимум один LEFT JOIN.
- [ ] Вслух: 1NF/2NF/3NF на одном примере, выбор DB под платежи/кэш/аналитику.

### День 15 — JOIN, NULL, агрегаты

- [ ] Повторить только слабые разделы SQLBolt 6–12. PGExercises [Aggregation](https://pgexercises.com/questions/aggregates/) — первые 6 задач и «List facilities with more than 1000 slots booked».
- [ ] Lab C — первые 4 задачи из таблицы expected; сначала скрыть ответы, сравнить после запуска. Проверить клиентов с нулём заказов, дубликаты, SUM/COUNT.
- [ ] Вслух: WHERE vs HAVING; WHERE vs ON для LEFT JOIN; COUNT(*) vs COUNT(column); logical query order.
- [ ] Опционально только вместо повторного чтения: [freeCodeCamp SQL video](https://www.youtube.com/watch?v=-fW2X7fh7Yg) 3:12:16–3:30:14 (joins). Курс MySQL, синтаксис практики проверять в PostgreSQL; не смотреть 5 часов.

### День 16 — подзапросы, CTE, оконные функции

- [ ] [PostgreSQL WITH](https://www.postgresql.org/docs/current/queries-with.html) §SELECT in WITH; [Window Functions](https://www.postgresql.org/docs/current/tutorial-window.html) — PARTITION BY, ORDER BY, ROW_NUMBER/RANK; не разбирать window frames.
- [ ] PGExercises Joins and Subqueries — последние 2 задачи; Aggregation — «Find the total revenue of each facility», «Produce a numbered list of members». Lab C — последние 3 задачи, последнюю запись получить также через ROW_NUMBER; решить 1 задачу двумя способами.
- [ ] Вслух: GROUP BY vs window functions, subquery vs CTE, UNION vs UNION ALL.
- [ ] Самопроверка: 1 новый JOIN + aggregation + subquery без подсказок.

### День 17 — ACID, isolation, индексы

- [ ] [PostgreSQL Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html); [Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html) — таблица аномалий, Read Committed, Repeatable Read, Serializable; отдельно lost update и условный UPDATE. [EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html) §EXPLAIN Basics и первый пример ANALYZE.
- [ ] Lab C: два подключения, последний товар; воспроизвести некорректный read-modify-write и затем conditional UPDATE (проверить affected rows) + заказ в одной транзакции. Проверить COMMIT/ROLLBACK. Предложить индекс под выборку заказов, посмотреть EXPLAIN до/после. Не требовать Index Scan на маленьком наборе.
- [ ] Вслух: A/C/I/D, четыре уровня изоляции, dirty/non-repeatable/phantom read, deadlock на уровне идеи, почему индекс не бесплатен.
- [ ] Если есть пробел: повторить одну аномалию с диаграммой параллельных транзакций.

### День 18 — контроль SQL и данных

- [ ] Без подсказок 4 запроса на новом датасете PGExercises или созданном наставником: LEFT JOIN/anti-join, aggregation/HAVING, subquery/CTE, latest row/window. Ограничить попытку 45–60 мин; проверять выполнение и корректность на NULL/дубликатах.
- [ ] Новый кейс бронирования билетов: ERD 5 сущностей, связь M:N, constraints, резерв последнего места и транзакционная граница.
- [ ] Gate 3: объяснить нормализацию, ACID, изоляцию, индексы и виды БД без подсказок. Самостоятельно исправить SQL-ошибки. Если не получается — повторить в резерв дня 29.

## Блок 4. Моделирование — дни 19–21

### День 19 — UML Sequence

- [ ] [Lucid Software video](https://www.youtube.com/watch?v=pCK6prSq8aw) — ATM walkthrough целиком или [текстовая версия](https://lucid.co/diagram/uml/sequence-diagram-tutorial); [PlantUML Sequence](https://plantuml.com/sequence-diagram): basic examples, declaring participants, arrows, grouping messages (alt/else, opt, loop), activations. Не учить все стили.
- [ ] Lab D: sequence заказа и оплаты с внешним сервисом, sync/async, response, alt успех/отказ/timeout; как проверить неизвестный результат платежа.
- [ ] С нуля нарисовать sequence банковского перевода; объяснить, чем sequence отличается от activity/DFD.
- [ ] Проверить, что сообщения совпадают с API, а ошибки — с Use Case.

### День 20 — BPMN

- [ ] [Camunda BPMN reference](https://camunda.com/bpmn/reference/): Pool, Lane, Task, XOR/AND/OR/Event-based gateway, Basic Events, Message/Timer/Error. [Camunda video](https://www.youtube.com/watch?v=0n8MiEmNg1Y) — только построение базовой модели, deployment/execution пропустить; текстовый reference достаточно.
- [ ] В [BPMN.io](https://demo.bpmn.io/) построить Lab D: покупатель, магазин, внешний провайдер; pools/lanes, XOR результата, timer резерва. Sequence flow только внутри pool, message flow между pools. Экспортировать BPMN.
- [ ] Нарисовать упрощённый процесс смены номера телефона. Объяснить XOR vs AND, что бывает при истечении ожидания.
- [ ] Проверить, что диаграмма имеет начало, завершение и все ветки.

### День 21 — State Machine и выбор нотации

- [ ] [PlantUML State](https://plantuml.com/state-diagram) — simple state, start/end, transitions, choices; [System Analyst Space](https://system-analyst.space/introduction/roadmap-start-here/) раздел UML — Use Case/Activity/Class на уровне чтения, не весь UML.
- [ ] Lab D: состояния заказа и оплаты отдельно, события и допустимые переходы, терминальные состояния, отмена/истечение/неопределенный результат. Нарисовать state machine и таблицу transitions; проверить против API, ERD и BPMN.
- [ ] Gate 4: новый мини-кейс (бронирование) — sequence + BPMN без шаблона, объяснить, что показывает каждая диаграмма и где нужен ERD/state.
- [ ] Короткий повтор SQL: один запрос с JOIN + GROUP BY из ошибок.

## Блок 5. Kafka, RabbitMQ — дни 22–24

### День 22 — Kafka

- [ ] [Confluent Kafka 101 EN](https://developer.confluent.io/courses/apache-kafka/events/) — видео Introduction 3m, Topics 9m, Partitions 4m, Brokers 4m, Replication 3m, Producers 6m, Consumers 9m. Только эти 7 модулей (около 38 минут по каталогу). Не выполнять cloud labs, Connect, Streams, Flink.
- [ ] Lab E: producer/consumer, topic, 3 partitions, key=orderId, offset, retention, replication, 2 consumer groups. Разложить 6 сообщений; показать назначения при 1/3/4 consumers внутри одной группы и независимое чтение другой группой.
- [ ] Вслух: где гарантируется порядок, зачем key, когда удаляется сообщение, зачем retention, что такое consumer lag; почему нет универсального «миллион сообщений/с».
- [ ] При свободном времени [Kafka Quickstart](https://kafka.apache.org/quickstart/) steps 1–5 — отправить и прочитать 3 сообщения. Не тратить обязательное время на установку кластера.

### День 23 — RabbitMQ

- [ ] Официальные tutorials JavaScript: [Work Queues](https://www.rabbitmq.com/tutorials/tutorial-two-javascript) — round robin, acknowledgements/durability; [Pub/Sub](https://www.rabbitmq.com/tutorials/tutorial-three-javascript) — exchange/fanout; [Routing](https://www.rabbitmq.com/tutorials/tutorial-four-javascript) — direct/binding/routing key; [Topics](https://www.rabbitmq.com/tutorials/tutorial-five-javascript) — wildcard routing, только пример. [Confirms](https://www.rabbitmq.com/docs/confirms) — Basics и manual/automatic ACK, publisher confirms.
- [ ] Нарисовать 2 схемы: work queue с 2 workers и fanout в 2 queues; маршрутизировать 4 сообщения по ключам; предсказать redelivery при сбое до ACK.
- [ ] Вслух: Kafka log vs RabbitMQ queue, pull vs push, когда удаляется, ACK vs publisher confirm, direct/fanout/topic, RabbitMQ Streams как исключение из обычной очереди.
- [ ] Опционально один локальный RabbitMQ work queue lab, если Kafka lab не сделан. Для месяца достаточно одного реального broker experiment; схема с объяснением обязательна для обоих.

### День 24 — гарантии доставки, retry, Outbox

- [ ] [Confluent delivery semantics](https://docs.confluent.io/kafka/design/delivery-semantics.html) — at most/at least/exactly once, границы внешней БД; видео-альтернатива [Delivery Semantics and Messaging Guarantees](https://www.youtube.com/watch?v=tj9T7GdSl3U). [RabbitMQ DLX](https://www.rabbitmq.com/docs/dlx) — определение и причины dead-letter; [Transactional Outbox video/text](https://developer.confluent.io/courses/microservices/the-transactional-outbox-pattern/) — только базовая идея.
- [ ] Lab E: OrderPaid event JSON с eventId/key/version/occurredAt; producer/consumers, delivery, retry/backoff/DLQ, дедупликация в одной транзакции, outbox. Таблица отказов: до/после обработки, до/после offset commit или ACK, сбой публикации после записи БД.
- [ ] Gate 5: на незнакомом кейсе уведомлений выбрать Kafka/RabbitMQ, защитить альтернативу; объяснить exactly-once не обещая однократный внешний эффект.
- [ ] Вслух сравнить event vs command, ACK vs offset, retry vs DLQ, outbox vs прямой publish.

## Блок 6. Архитектура, безопасность, сопровождение — дни 25–27

### День 25 — System Design и NFR

- [ ] [System Design Primer](https://github.com/donnemartin/system-design-primer): Performance vs scalability; Latency vs throughput; Availability vs consistency; Load balancer; Database (replication/sharding обзорно); Cache; Asynchronism. [Microsoft Microservices](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/microservices) — benefits/challenges, не весь cloud stack. CAP при partition, eventual consistency, Saga/circuit breaker — объяснить идею, не реализацию. Лимит 60 мин на весь теоретический блок; CAP, Saga и circuit breaker — по одному определению и примеру (детали P1).
- [ ] [C4 context](https://c4model.com/diagrams/system-context) и [container](https://c4model.com/diagrams/container) — примеры и границы. Lab F: начать с monolith + PostgreSQL + provider; нарисовать 2 C4 диаграммы и обосновать когда добавить cache, gateway, broker, сервис. Не добавлять их без требований.
- [ ] Написать 3 измеримых NFR (P95 latency, availability, data freshness) при учебной нагрузке; указать окно/условия проверки. Объяснить RPS, throughput, SLA/SLI/SLO, TTL, отказ зависимостей.
- [ ] Вслух: scale up/out, load balancer vs gateway, монолит vs микросервисы, кэш и консистентность.

### День 26 — Security, отказ и наблюдаемость

- [ ] [JWT introduction](https://www.jwt.io/introduction) — structure, verification; [Auth0 OIDC](https://auth0.com/intro-to-iam/what-is-openid-connect-oidc) — OAuth2 vs OIDC, access vs ID token; [OWASP API1:2023](https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/) — attack scenario/prevention. Authn/authz, RBAC, TLS, secrets/PII, JWT подписан ≠ зашифрован.
- [ ] Lab F: customer A запрашивает order B; описать серверную object-level проверку и роль поддержки, 401/403/404 по контракту, 2 негативных теста. Не логировать токены/персональные данные.
- [ ] Смоделировать timeout провайдера: retry только для допустимых операций, backoff, проверка результата, circuit breaker на уровне идеи. Записать какие logs/metrics/traces/correlation ID нужны для диагностики.
- [ ] Вслух: authentication/authorization, JWT/OAuth2/OIDC, почему frontend проверка прав недостаточна.

### День 27 — приёмка, дефекты, изменение требований

- [ ] Вигерс гл. 17 — validating requirements, acceptance criteria; гл. 28–29 — impact analysis/traceability. Или IREB §4.4.1–4.4.2 и §6.6–6.7 — только validation, change, tracing; повторить материал дня 06, не перечитывать всё. Повторить SDLC, функциональное/интеграционное/regression/smoke/load/UAT, severity/priority; DEV/QA/STAGE/PROD, CI/CD на уровне назначения.
- [ ] Lab F: bug report двойной оплаты (steps, expected/actual, environment, evidence); Jira-ready постановка на исправление с FR/API/ERD links, exceptions, criteria. Trace 3 FR → test cases. Отличить дефект от CR.
- [ ] Change request: частичная оплата. Impact map: требования, API, БД, статусы, события, тесты, миграция/backward compatibility.
- [ ] Gate 6: защитить архитектуру и одну альтернативу, объяснить отказ, метрики, безопасность и влияние изменения. Проверить согласованность всех артефактов.

## Блок 7. Интервью — дни 28–30

### День 28 — полный mock №1

- [ ] [Ольга Пономарёва — 10 вопросов](https://www.youtube.com/watch?v=6Nry2flcM3k): выбрать 3–5 незнакомых вопросов, пауза до ответа; видео необязательно, если есть реальный mock.
- [ ] 60–90 минут: самопрезентация, теория смешанно по блокам, SQL без подсказок, новый кейс (не Order Management), уточнение требований, API/ERD/sequence или BPMN и один failure path. Интервьюер задаёт follow-up и меняет условие.
- [ ] Оценить кейс по [[SA Interview Scorecard]] (8 критериев, 0–2). Сохранить только 1–3 существенных пробела, исправить одну наиболее опасную ошибку.
- [ ] Разобрать собственные рабочие истории: мой вклад, альтернативы, результат, где не было аналитического опыта.

### День 29 — закрытие пробелов

- [ ] Вернуться к максимум 3 ошибкам из mock и gates. Для каждой: прочитать только соответствующий раздел дня, решить новую задачу без подсказок, объяснить причину ошибки.
- [ ] Незнакомый SQL drill: 4 задачи как в дне 18 с другим набором данных; API drill: 3–5 операций для нового кейса, контракт/ошибки/идемпотентность и маппинг.
- [ ] Доделать только обязательный пропущенный артефакт/эксперимент. Не добавлять новый курс или проект.
- [ ] Сверить требования 3–5 целевых вакансий, отдельно записать специфические требования работодателя. Приоритет отдавать повторяющимся пробелам, а не всем технологиям из объявления.

### День 30 — полный mock №2 и решение о готовности

- [ ] 60–90 минут mock с другим незнакомым кейсом (наставник придумывает новый). Повторить формат дня 28, никакого поиска готовых ответов; разрешены уточнения условий.
- [ ] Пройти рубрику Scorecard: каждый из двух разных mock ≥13/16, без критических ошибок, отдельный SQL/API drill пройден, gates 1–6 закрыты. Устно защитить 2–3 реальных истории.
- [ ] Если не достигнуто — определить конкретные 1–3 навыка для повторного интервью, не начинать roadmap заново. Если достигнуто — продолжить отклики и реальные интервью, адаптировать по feedback. Месяц — ориентир интенсивности, а не автоматическое получение Middle.
- [ ] Сохранить финальную версию учебного кейса; не выдавать за коммерческую работу.

## Источники и границы ревью

Сверка 25.11.2026: [Сбер](https://developers.sber.ru/kak-v-sbere/interview/sa-developer), [analystRoadmap/analyst_book](https://github.com/analystRoadmap/analyst_book), [System Analyst Space](https://system-analyst.space/introduction/roadmap-start-here/), [System Design Primer](https://github.com/donnemartin/system-design-primer). Это проверка покрытия, а не частотная статистика. Собственной выборки 200 вакансий HH нет. IREB handbook v1.3.2 — проверено оглавление, включая страницы 6–8; Вигерс — оглавление английского третьего издания, не весь текст. Уроки SQLBolt, списки упражнений PGExercises, модули Kafka 101 и официальные страницы инструментов сверены по доступному содержимому. YouTube-ролики проверены по индексированным названиям/описаниям, а не полным просмотром; при недоступности использовать указанную текстовую альтернативу. Не считать все источники полностью прочитанными. 7 ожидаемых наборов результатов SQL fixture независимо сверены через SQLite (проверка данных/результатов, не PostgreSQL isolation/EXPLAIN). Последние эксперименты выполняет сам обучающийся на PostgreSQL.

Метод: [Dunlosky et al.](https://doi.org/10.1177/1529100612453266) — practice testing и distributed practice; соотношение времени и пороги — учебные решения, не доказанные нормы грейда.

Не включено в обязательный месяц: Kubernetes, администрирование Kafka/PostgreSQL, глубокий TCP, DDD/CQRS/Event Sourcing, все UML/BPMN элементы, LeetCode, новый язык, BABOK и Клеппман целиком. Изучать только под конкретную вакансию после core.

[[SA Practice Lab]] · [[SA Interview Scorecard]] · [[Interview Preparation Plan]]
