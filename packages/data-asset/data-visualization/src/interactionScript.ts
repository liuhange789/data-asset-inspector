import type { VisualizationConfig } from '@liuhange/dsh-data-asset-shared'

export class InteractionScript {
  generate(interactions: VisualizationConfig['interactions']): string {
    const parts: string[] = []

    if (interactions.expandCollapse) {
      parts.push(`
function toggleSection(id) {
  const el = document.getElementById(id);
  if (el) { el.style.display = el.style.display === 'none' ? 'block' : 'none'; }
}`)
    }

    if (interactions.chartSwitch) {
      parts.push(`
function switchChart(selectId, chartContainerId) {
  const select = document.getElementById(selectId);
  const container = document.getElementById(chartContainerId);
  if (select && container) {
    const charts = container.querySelectorAll('.chart-item');
    charts.forEach(c => c.style.display = 'none');
    const selected = container.querySelector('#' + select.value);
    if (selected) { selected.style.display = 'block'; }
  }
}`)
    }

    if (interactions.tooltip) {
      parts.push(`
document.addEventListener('DOMContentLoaded', function() {
  const elements = document.querySelectorAll('[data-tooltip]');
  elements.forEach(el => {
    el.addEventListener('mouseenter', function(e) {
      const tooltip = document.createElement('div');
      tooltip.textContent = e.target.getAttribute('data-tooltip');
      tooltip.style.cssText = 'position:absolute;background:#333;color:#fff;padding:5px;border-radius:3px;font-size:12px;z-index:1000;';
      tooltip.id = 'tooltip';
      document.body.appendChild(tooltip);
    });
    el.addEventListener('mouseleave', function() {
      const tooltip = document.getElementById('tooltip');
      if (tooltip) { tooltip.remove(); }
    });
  });
});`)
    }

    return parts.join('\n')
  }
}