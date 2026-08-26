# Ink Dark Theme

Dark mode uses a complete surface inversion instead of placing cream cards on a
dark page. The page, header, panels, cards, inputs, menus, and modals use layered
green-charcoal surfaces. Warm off-white text provides high contrast, with muted
copy remaining above the WCAG AA contrast threshold.

Brand accents stay vivid against the darker foundation. Yellow, lime, and
gradient controls use explicit dark foreground colors rather than inheriting
the light dark-mode body text. The inline first-paint colors in `index.html`
match the final theme to prevent a pale flash during startup.

Automated coverage checks every principal surface is genuinely dark, verifies
primary, secondary, and muted text contrast, and keeps the first-paint palette
synchronized with the CSS theme variables.
