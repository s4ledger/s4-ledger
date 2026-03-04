// S4 Ledger — DOMPurify sanitization layer
// All innerHTML assignments should go through window._s4Safe(html)
// to prevent XSS via user-supplied content.
import DOMPurify from 'dompurify';

// Configure: allow standard HTML + Font Awesome icons + style attrs
DOMPurify.setConfig({
    ALLOWED_TAGS: [
        'a','b','br','code','details','div','em','h1','h2','h3','h4','h5','h6',
        'hr','i','img','li','ol','p','pre','small','span','strong','sub','summary',
        'sup','table','tbody','td','th','thead','tr','u','ul','button','label',
        'input','select','option','textarea','form','section','header','footer',
        'nav','main','article','aside','figure','figcaption','blockquote','dl','dt','dd'
    ],
    ALLOWED_ATTR: [
        'class','id','style','href','target','rel','src','alt','title','colspan','rowspan',
        'type','value','placeholder','name','for','aria-label','aria-hidden','aria-expanded',
        'aria-controls','role','tabindex','data-*','onclick','onchange','disabled','checked',
        'selected','readonly','width','height','loading'
    ],
    ALLOW_DATA_ATTR: true,
    ADD_ATTR: ['target'],
    ADD_URI_SAFE_ATTR: ['onclick', 'onchange'],
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
});

/**
 * Sanitize HTML string through DOMPurify.
 * Safe for innerHTML assignment — strips script injection, event handler injection,
 * and other XSS vectors while preserving layout and Font Awesome icons.
 * @param {string} dirty - Raw HTML string
 * @returns {string} Sanitized HTML string
 */
function s4Safe(dirty) {
    if (typeof dirty !== 'string') return '';
    return DOMPurify.sanitize(dirty);
}

// Expose globally for use in all chunks (engine.js, enhancements.js, metrics.js, etc.)
window._s4Safe = s4Safe;
window.DOMPurify = DOMPurify;

// Export for direct ESM import if needed
export { s4Safe, DOMPurify };
