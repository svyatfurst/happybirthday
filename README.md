# Mii Island — WebGL-проєкт для GitHub Pages

Готова статична Three.js-сцена: посеред зеленого плаваючого острова стоїть анімована Mii, а по краях розставлені чотири надані 3D-моделі. Нічого збирати через npm не потрібно — сайт складається зі звичайних HTML, CSS, JavaScript, GLB/GLTF та аудіофайлів.

## Що вже працює

- острів обертається **тільки горизонтально** перетягуванням миші або пальця;
- також працюють колесо/трекпад, кнопки `← →` на екрані та клавіші зі стрілками;
- поки острів рухається, центральна Mii запускає анімацію `Happy` і грає зациклений звук;
- після зупинки Mii повертається до `Idle`;
- натискання на Mii запускає смішну анімацію `Annoyed` і окремий звук;
- кожна мала фігурка має власний звук, підсвічується при наведенні та підстрибує після натискання;
- є перемикач звуку, адаптивний інтерфейс для телефона й екран із ліцензіями;
- усі локальні шляхи відносні, тому сайт працює і як `username.github.io`, і як `username.github.io/repository-name/`;
- у `.github/workflows/pages.yml` уже лежить автоматичний деплой на GitHub Pages;
- `.nojekyll` уже додано.

## Структура, яку треба залити

```text
index.html
styles.css
.nojekyll
.github/workflows/pages.yml
src/
assets/models/
assets/sounds/
licenses/
CREDITS.md
```

Не викидай папку `.github` і файл `.nojekyll`. У Windows вони можуть виглядати як приховані.

## Локальний запуск

Не відкривай `index.html` подвійним кліком: браузер зазвичай блокує ES-модулі та GLB/GLTF через `file://`.

### Windows

Запусти `start-local.bat` або відкрий термінал у корені проєкту:

```powershell
python -m http.server 8080
```

### macOS / Linux

```bash
./start-local.sh
```

Потім відкрий:

```text
http://localhost:8080
```

## Публікація на GitHub Pages

1. Створи новий GitHub-репозиторій.
2. Розпакуй ZIP і завантаж **вміст папки**, а не саму зовнішню папку. `index.html` має лежати прямо в корені репозиторію.
3. Переконайся, що код знаходиться у гілці `main`.
4. Відкрий `Settings → Pages`.
5. У `Build and deployment → Source` вибери **GitHub Actions**.
6. Відкрий вкладку `Actions`, обери `Deploy Mii Island to Pages` і натисни `Run workflow`. Після наступних push у `main` сайт оновлюватиметься автоматично.

Адреса матиме приблизно такий вигляд:

```text
https://USERNAME.github.io/REPOSITORY/
```

Якщо перший workflow запустився раніше, ніж у Pages було вибрано `GitHub Actions`, після зміни налаштування натисни `Re-run all jobs`.

### Через Git у терміналі

```bash
git init
git add -A
git commit -m "Add Mii Island WebGL site"
git branch -M main
git remote add origin https://github.com/USERNAME/REPOSITORY.git
git push -u origin main
```

## Як замінити звуки

Усі звуки лежать у:

```text
assets/sounds/
```

Найпростіше — замінити файл своїм, **залишивши те саме ім’я**:

| Файл | Коли грає |
|---|---|
| `spin-loop.wav` | поки острів обертається |
| `mii-angry.wav` | натискання на центральну Mii |
| `hachiware.wav` | натискання на Hachiware |
| `teto.wav` | натискання на Teto Plush |
| `cat.wav` | натискання на кота |
| `charlie.wav` | натискання на Freedom Shirt |

Можна використовувати `.wav`, `.mp3` або `.ogg`. Якщо розширення чи назва інші, зміни шлях у:

```text
src/config.js
```

Приклад:

```js
cat: {
  src: './assets/sounds/my-new-cat-sound.mp3',
  volume: 0.75,
  playbackRate: 1.1,
},
```

- `volume` — гучність від `0` до `1`;
- `playbackRate: 1` — звичайна швидкість;
- `playbackRate: 0.8` — повільніше;
- `playbackRate: 1.2` — швидше;
- `loop: true` потрібен для звуку обертання.

Для `spin-loop` найкраще брати короткий звук, у якого кінець плавно переходить у початок. Браузер дозволяє звук після першої взаємодії користувача; тут розблокування відбувається автоматично під час першого кліку, перетягування, прокручування або натискання кнопки.

## Як змінити позиції та розмір фігурок

У `src/config.js` є масив `figurines`:

```js
{
  id: 'hachiware',
  label: 'Hachiware',
  url: './assets/models/hachiware.glb',
  angle: 18,
  radius: 4.35,
  targetSize: 1.55,
  fit: 'height',
  rotationOffset: 90,
  sound: 'hachiware',
}
```

- `angle` — позиція навколо острова у градусах;
- `radius` — відстань від центра острова;
- `targetSize` — бажаний розмір моделі;
- `fit: 'height'` — масштаб за висотою;
- `fit: 'max'` — масштаб за найбільшим виміром;
- `rotationOffset` — поправка напрямку моделі; наприклад `180` розвертає її спиною/обличчям;
- `sound` — ключ звуку з блоку `sounds`.

Центральна Mii налаштовується у блоці `mainCharacter`, а камера та швидкість обертання — у блоках `camera` й `island`.

## Як додати ще одну модель

1. Поклади `.glb` у `assets/models/`.
2. Поклади звук у `assets/sounds/`.
3. Додай конфігурацію звуку до `sounds` у `src/config.js`.
4. Додай модель до масиву `figurines`.

```js
{
  id: 'new-model',
  label: 'New Model',
  url: './assets/models/new-model.glb',
  angle: 250,
  radius: 4.2,
  targetSize: 1.5,
  fit: 'height',
  rotationOffset: 0,
  sound: 'newModelSound',
},
```

Після цього модель автоматично отримає клік, підсвічення, підстрибування та свій звук.

## Анімації центральної Mii

Файл `assets/models/mii_character.glb` уже містить три кліпи:

- `Idle`;
- `Happy`;
- `Annoyed`.

Перемиканням керує `src/mii-animator.js`. `Annoyed` програється один раз, після чого персонаж повертається до `Happy`, якщо острів ще рухається, або до `Idle`, якщо він уже зупинився.

## Ліцензії

Повна атрибуція збережена у `CREDITS.md` і показується кнопкою «Ліцензії» на самому сайті.

Особливо важливо:

- `My Stupid Idiot Cat` має **CC BY-NC 4.0**, тобто модель не можна використовувати комерційно без окремого дозволу автора;
- `Hachiware` має **CC BY-ND 4.0**, тому оригінальний GLB не редагувався; сайт лише змінює його позицію, поворот та рівномірний масштаб під час виконання;
- для Charlie збережено оригінальний текст ліцензії й атрибуцію.

Процедурні WAV-заглушки можна замінювати вільно.

## Технології

- Three.js `0.185.1` через зафіксований jsDelivr import map;
- `GLTFLoader` для `.glb` та `.gltf`;
- WebGL, HTML, CSS та нативний JavaScript;
- без npm, bundler, бекенду й серверних мов.
