const statusText = (el, text) => { if (el) el.textContent = text; };
const themeToggle = document.querySelector('.theme-toggle');
themeToggle?.addEventListener('click', () => {
 const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
 document.documentElement.dataset.theme = theme;
 localStorage.setItem('theme', theme);
});
async function postForm(form) {
 const response = await fetch(form.action, {method: 'POST', body: new FormData(form), headers: {Accept: 'application/json'}});
 if (!response.ok) throw new Error(await response.text());
 return response.json();
}
// The first ten posts and next-page links are server-rendered for readers and crawlers.
let loading = false;
const more = document.querySelector('#load-more');
async function loadMore(event) {
 event?.preventDefault();
 if (loading || !more) return;
 loading = true;
 more.setAttribute('aria-disabled', 'true');
 const url = new URL(more.href);
 try {
  const response = await fetch(`/api/posts${url.search}`);
  if (!response.ok) throw new Error('Could not load posts. Try the button again.');
  const data = await response.json();
  document.querySelector('#post-list').insertAdjacentHTML('beforeend', data.html);
  statusText(document.querySelector('#feed-status'), 'More posts loaded.');
  if (data.more) { url.searchParams.set('page', String(Number(url.searchParams.get('page')) + 1)); more.href = url.toString(); }
  else { observer?.disconnect(); more.remove(); statusText(document.querySelector('#feed-status'), "You're all caught up."); }
 } catch (error) { statusText(document.querySelector('#feed-status'), error.message); observer?.disconnect(); }
 finally { loading = false; more.removeAttribute('aria-disabled'); }
}
const observer = more && 'IntersectionObserver' in window ? new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) loadMore(); }, {rootMargin: '180px'}) : null;
more?.addEventListener('click', loadMore);
if (more) observer?.observe(more);
document.querySelector('[data-like]')?.addEventListener('submit', async event => {
 event.preventDefault();
 const form = event.currentTarget, button = form.querySelector('button');
 button.disabled = true;
 try {
  const result = await postForm(form);
  form.querySelector('[data-like-count]').textContent = result.likes;
  form.querySelector('[data-like-label]').textContent = 'Liked';
  button.setAttribute('aria-pressed','true');
 } catch (error) { statusText(document.querySelector('#interaction-status'),error.message); }
 finally { button.disabled = false; }
});
const commentForm = document.querySelector('[data-comment]');
commentForm?.addEventListener('submit', async event => {
 event.preventDefault();
 const button = commentForm.querySelector('[type=submit]');
 button.disabled = true;
 try {
  const result = await postForm(commentForm);
  commentForm.reset(); cancelReply(); window.turnstile?.reset();
  statusText(commentForm.querySelector('[data-comment-status]'), result.message);
  if (result.published) location.href = `?comment=${result.id}#comment-${result.id}`;
 } catch (error) { statusText(commentForm.querySelector('[data-comment-status]'),error.message); }
 finally { button.disabled = false; }
});
function cancelReply() {
 const reply = document.querySelector('#reply-id');
 if (reply) reply.value = '';
 const label = document.querySelector('#reply-label');
 if (label) label.hidden = true;
}
document.querySelector('#cancel-reply')?.addEventListener('click', cancelReply);
document.querySelectorAll('[data-reply]').forEach(button => button.addEventListener('click', () => {
 document.querySelector('#reply-id').value = button.dataset.reply;
 document.querySelector('#reply-name').textContent = button.dataset.name;
 document.querySelector('#reply-label').hidden = false;
 commentForm.querySelector('textarea').focus();
 commentForm.scrollIntoView({block:'center'});
}));
document.querySelector('#preview-button')?.addEventListener('click', async event => {
 const button = event.currentTarget, form = document.querySelector('#editor');
 button.disabled = true;
 try {
  const response = await fetch('/admin/preview', {method:'POST',body:new FormData(form)});
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  const preview = document.querySelector('#preview');
  preview.innerHTML = data.html; preview.hidden = false;
  preview.scrollIntoView({block:'start'});
  statusText(document.querySelector('#editor-status'), 'Preview updated.');
 } catch(error) { statusText(document.querySelector('#editor-status'), error.message); }
 finally { button.disabled = false; }
});
const editor = document.querySelector('#editor');
let dirty = false;
editor?.addEventListener('input', () => { dirty = true; });
editor?.addEventListener('submit', () => { dirty = false; });
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
document.querySelectorAll('[data-confirm]').forEach(form => form.addEventListener('submit', event => { if (!confirm(form.dataset.confirm)) event.preventDefault(); }));
document.querySelectorAll('[data-open-modal]').forEach(button => button.addEventListener('click', () => {
 const dialog = document.getElementById(button.dataset.openModal);
 dialog?.showModal();
 dialog?.querySelector('textarea')?.focus();
}));
document.querySelectorAll('[data-close-modal]').forEach(button => button.addEventListener('click', () => button.closest('dialog')?.close()));
document.querySelectorAll('.edit-dialog').forEach(dialog => dialog.addEventListener('click', event => {
 if (event.target === dialog) dialog.close();
}));
