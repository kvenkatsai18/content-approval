// Educational holidays and events relevant to teachers, students, and schools
// Add or remove events as needed
const educationEvents = [
  { name: "World Day for Audiovisual Heritage", date: "10-27", icon: "📚" },
  { name: "International Day of the Girl Child", date: "10-11", icon: "👧" },
  { name: "World Mental Health Day", date: "10-10", icon: "🧠" },
  { name: "World Teachers Day", date: "10-05", icon: "🍎" },
  { name: "World Day of Teachers (UNESCO)", date: "10-05", icon: "🌍" },
  { name: "International Day of Older Persons", date: "10-01", icon: "👵" },
  { name: "World Day of Poetry", date: "09-08", icon: "📝" },
  { name: "International Literacy Day", date: "09-08", icon: "📖" },
  { name: "World Physical Therapy Day", date: "09-08", icon: "🏃" },
  { name: "International Day of Education", date: "01-24", icon: "🎓" },
  { name: "World Religion Day", date: "01-19", icon: "✨" },
  { name: "International Day of Schools", date: "01-21", icon: "🏫" },
  { name: "World Youth Skills Day", date: "07-15", icon: "🛠" },
  { name: "World Population Day", date: "07-11", icon: "🌍" },
  { name: "World Youth Day", date: "04-06", icon: "🌟" },
  { name: "World Book Day", date: "04-23", icon: "📚" },
  { name: "International Mother Earth Day", date: "04-22", icon: "🌎" },
  { name: "Earth Day", date: "04-22", icon: "🌱" },
  { name: "World Immunization Week", date: "04-24", icon: "💉" },
  { name: "World Day for Safety and Health at Work", date: "04-28", icon: "⚠️" },
  { name: "International Day of Families", date: "05-15", icon: "👨‍👩‍👧" },
  { name: "International Day of Light", date: "05-16", icon: "💡" },
  { name: "World Telecommunication Day", date: "05-17", icon: "📡" },
  { name: "World Day for Cultural Diversity", date: "05-21", icon: "🎭" },
  { name: "World Day of Bee Day", date: "05-20", icon: "🐝" },
  { name: "World Biodiversity Day", date: "05-22", icon: "🦋" },
  { name: "Global Day of Parents", date: "06-01", icon: "❤️" },
  { name: "World Day Against Child Labour", date: "06-12", icon: "🚫" },
  { name: "World Day to Combat Desertification", date: "06-17", icon: "🏜️" },
  { name: "International Day of the African Child", date: "06-16", icon: "🧒" },
  { name: "World Refugee Day", date: "06-20", icon: "🌍" },
  { name: "International Day of Yoga", date: "06-21", icon: "🧘" },
  { name: "World Day of Parents", date: "06-01", icon: "👨‍👩‍👧‍👦" },
  { name: "International Day of the Girl Child", date: "10-11", icon: "👧" },
  { name: "World Student Day", date: "12-01", icon: "🎒" },
  { name: "Human Rights Day", date: "12-10", icon: "✊" },
  { name: "International Day of Disabled Persons", date: "12-03", icon: "♿" },
  { name: "World Computer Literacy Day", date: "12-02", icon: "💻" },
  { name: "International Anti-Corruption Day", date: "12-09", icon: "🔍" },
  { name: "World Poverty Day", date: "10-17", icon: "🤝" },
  { name: "World Development Days", date: "10-12", icon: "🌍" },
  { name: "International Day of Rural Women", date: "10-15", icon: "👩‍🌾" },
  { name: "World Food Day", date: "10-16", icon: "🍽️" },
  { name: "International Day of the Girl Child", date: "10-11", icon: "👧" },
  { name: "WorldSkills International Day", date: "09-15", icon: "🛠" },
  { name: "International Day of Democracy", date: "09-15", icon: "🗳️" },
  { name: "World Patient Safety Day", date: "09-17", icon: "🏥" },
  { name: "World Water Day", date: "03-22", icon: "💧" },
  { name: "World Forestry Day", date: "03-21", icon: "🌳" },
  { name: "World Sleep Day", date: "03-15", icon: "😴" },
  { name: "World Maths Day", date: "03-14", icon: "π" },
  { name: "International Day of Happiness", date: "03-20", icon: "😊" },
  { name: "World Science Day", date: "03-10", icon: "🔬" },
  { name: "International Day of Women & Girls in Science", date: "02-11", icon: "👩‍🔬" },
  { name: "World Day of Social Justice", date: "02-20", icon: "⚖️" },
  { name: "International Day of Education", date: "01-24", icon: "🎓" },
  { name: "World Literacy Day", date: "09-08", icon: "📖" },
  { name: "World Physics Day", date: "04-14", icon: "⚛️" },
];

function getEventsForYear(year) {
  return educationEvents.map(e => {
    const [month, day] = e.date.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    if (isNaN(d.getTime())) return null;
    return { ...e, fullDate: d, key: `${year}-${e.date}` };
  }).filter(Boolean);
}

function getEventsForDay(date) {
  const year = date.getFullYear();
  const events = getEventsForYear(year);
  return events.filter(e =>
    e.fullDate.getMonth() === date.getMonth() &&
    e.fullDate.getDate() === date.getDate()
  );
}