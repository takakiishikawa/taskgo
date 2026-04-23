export function DarkModeInit() {
  const script = `(function(){
    var t=localStorage.getItem('taskgo-theme')||'light';
    if(t==='dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  })();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
