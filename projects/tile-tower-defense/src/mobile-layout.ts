import { t } from './i18n';

export const compactLayout = window.matchMedia(
  '(max-width: 700px), (max-height: 550px), (pointer: coarse) and (max-width: 1100px)',
);

/** Move existing controls so their state and command handlers remain shared. */
export class MobileLayout {
  private menu = document.querySelector<HTMLDetailsElement>('.settings')!;
  private toggle = document.getElementById('dock-toggle')!;

  constructor() {
    const panel = this.menu.querySelector<HTMLElement>('.floating-panel')!;
    const sections = [
      ['layout.navigation', ['world-controls', 'world-navigation']],
      ['a11y.wavePreview', ['wave-preview']],
      ['layout.match', ['capacity-open', 'biome-open', 'add-com']],
      ['layout.reference', ['catalog-open', 'statistics-open']],
    ] as const;
    const moved: { element: HTMLElement; marker: Comment; section: HTMLElement }[] = [];
    for (const [label, ids] of sections) {
      const section = document.createElement('section');
      section.className = 'mobile-menu-section';
      const heading = document.createElement('h3');
      heading.textContent = t(label);
      section.append(heading);
      panel.insertBefore(section, panel.querySelector('strong'));
      for (const id of ids) {
        const element = document.getElementById(id)!;
        const marker = document.createComment(id);
        element.before(marker);
        moved.push({ element, marker, section });
      }
    }
    for (const id of ['catalog-open', 'statistics-open']) {
      const label = document.createElement('span');
      label.className = 'mobile-menu-label';
      label.textContent = t(id === 'catalog-open' ? 'a11y.guide' : 'stats.title');
      document.getElementById(id)!.append(label);
    }
    const update = () => {
      this.menu.open = false;
      document.body.classList.toggle('compact-layout', compactLayout.matches);
      for (const { element, marker, section } of moved) {
        if (compactLayout.matches) section.append(element);
        else marker.after(element);
      }
      (document.getElementById('wave-preview') as HTMLDetailsElement).open = !compactLayout.matches;
      this.setActions(false);
    };
    update();
    compactLayout.addEventListener('change', update);
    this.toggle.onclick = () => this.setActions(document.body.classList.contains('dock-collapsed'));
    this.menu.addEventListener('toggle', () => {
      if (compactLayout.matches && this.menu.open) this.setActions(false);
    });
    panel.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest('button');
      if (button && button.id !== 'audio-mute') {
        this.menu.open = false;
        if (this.menu.contains(document.activeElement)) {
          this.menu.querySelector('summary')!.focus();
        }
      }
    });
    document.addEventListener('pointerdown', (event) => {
      if (!this.menu.contains(event.target as Node)) this.menu.open = false;
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.menu.open) {
        this.menu.open = false;
        this.menu.querySelector('summary')!.focus();
      }
    });
  }

  setActions(open: boolean) {
    document.body.classList.toggle('dock-collapsed', !open);
    this.toggle.setAttribute('aria-expanded', String(open));
    this.toggle.textContent = t(open ? 'layout.hideActions' : 'layout.showActions');
    if (open) this.menu.open = false;
  }
}
