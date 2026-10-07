// Markdown may interpret <fstream> or the <int> in std::vector<int> as HTML.
// Format C++ header/template names in prose, preserving existing code spans and fences.
export function cppProse(text = '') {
  return text.split(/(```[\s\S]*?```|`[^`]*`)/g).map((part, index) => index % 2 ? part : part.replace(
    /\bstd::(?:array|vector|uniform_int_distribution)<[^>\n]+>|<(?:iostream|array|vector|fstream|stdexcept|cassert|random|string|sstream|memory|limits|cmath|cstdint)>/g,
    match => '`' + match + '`',
  )).join('');
}
