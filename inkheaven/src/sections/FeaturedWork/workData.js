export const categories = [
  { id: 'all', label: 'All' },
  { id: 'blackwork', label: 'Blackwork' },
  { id: 'realism', label: 'Realism' },
  { id: 'fineline', label: 'Fine Line' },
  { id: 'anime', label: 'Anime' },
]

const ONE_COL = '(min-width:1200px) 25vw, (min-width:768px) 50vw, 92vw'
const TWO_COL = '(min-width:1200px) 50vw, 92vw'

const set = (name, widths) =>
  widths.map((w) => `images/work-section/${name}-${w}.webp ${w}w`).join(', ')

const avifSet = (name, widths) =>
  widths.map((w) => `images/work-section/${name}-${w}.avif ${w}w`).join(', ')

export const workItems = [
  {
    id: 1,
    category: 'blackwork',
    title: 'Full Sleeve',
    size: 'tall',
    image: 'images/work-section/blackwork-full-sleeve-800.webp',
    imageSet: set('blackwork-full-sleeve', [400, 800]),
    sizes: ONE_COL,
  },
  {
    id: 2,
    category: 'fineline',
    title: 'Custom Piece',
    size: 'small',
    image: 'images/work-section/fine-line-custom-piece-800.webp',
    imageSet: set('fine-line-custom-piece', [400, 800]),
    sizes: ONE_COL,
  },
  {
    id: 3,
    category: 'realism',
    title: 'Portrait',
    size: 'small',
    image: 'images/work-section/realism-portrait.webp',
    imageSet:
      'images/work-section/realism-portrait-400.webp 400w, images/work-section/realism-portrait.webp 480w',
    sizes: ONE_COL,
  },
  {
    id: 4,
    category: 'anime',
    title: 'Character Study',
    size: 'wide',
    image: 'images/work-section/anime-character-1280.webp',
    imageSet: set('anime-character', [800, 1280]),
    imageAvif: avifSet('anime-character', [800, 1280]),
    sizes: TWO_COL,
  },
  {
    id: 5,
    category: 'blackwork',
    title: 'Back Piece',
    size: 'tall',
    image: 'images/work-section/blackwork-back-piece-800.webp',
    imageSet: set('blackwork-back-piece', [400, 800]),
    sizes: ONE_COL,
  },
  {
    id: 6,
    category: 'fineline',
    title: 'Minimal Piece',
    size: 'small',
    image: 'images/work-section/fine-line-minimal-piece-1280.webp',
    imageSet: set('fine-line-minimal-piece', [800, 1280]),
    sizes: ONE_COL,
  },
  {
    id: 7,
    category: 'realism',
    title: 'Fine Art',
    size: 'small',
    image: 'images/work-section/realism-fine-art-800.webp',
    imageSet: set('realism-fine-art', [400, 800]),
    sizes: ONE_COL,
  },
  {
    id: 8,
    category: 'anime',
    title: 'Manga Panel',
    size: 'wide',
    image: 'images/work-section/anime-manga-panel-1280.webp',
    imageSet: set('anime-manga-panel', [800, 1280]),
    imageAvif: avifSet('anime-manga-panel', [800, 1280]),
    sizes: TWO_COL,
  },
]