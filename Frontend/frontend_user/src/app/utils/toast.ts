import Toastify from 'toastify-js';
import "toastify-js/src/toastify.css";

export function showToast(message: string, type: 'success' | 'error' = 'error') {
  Toastify({
    text: message,
    duration: 4000,
    gravity: "top",
    position: "right",
    backgroundColor: type === 'error' ? "#e74c3c" : "#27ae60",
    stopOnFocus: true,
    close: true,
  }).showToast();
}
