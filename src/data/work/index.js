// Registry of long-form case studies. A project card is openable iff its
// id is a key here. Lazy imports keep case-study content (prose, ascii
// diagrams) out of the initial bundle.

export const workRegistry = {
  chuloopa: () => import('./chuloopa.js'),
};
