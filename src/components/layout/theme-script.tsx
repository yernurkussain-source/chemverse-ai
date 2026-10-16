// Бет сызылмай тұрып таңдалған режимді қосады — ашық/қараңғы «жыпылықтамайды»
const script = `try{if(localStorage.getItem("cv-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
