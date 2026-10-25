const faq = [
  {
    question: "What does EV News Desk cover?",
    parts: [
      {
        text: "EV News Desk covers electric vehicles on five desks: Cars, Batteries, Charging, Policy, and Industry/Business.",
      },
    ],
  },
  {
    question: "How often does the desk publish?",
    parts: [
      {
        text: "EV News Desk is a daily electric-vehicle desk. A story appears on the site after it leaves draft status with a public source list.",
      },
    ],
  },
  {
    question: "How are stories sourced?",
    parts: [
      {
        text: "Every published article lists public sources. A company announcement is reported as the company's own statement. A claim is called independently verified only when a source other than the company confirms it. The rule is on ",
      },
      { text: "Sources & Ethics", href: "/sources-ethics/" },
      { text: "." },
    ],
  },
  {
    question: "How does the desk correct an error?",
    parts: [
      {
        text: "A factual error is corrected on the article, not quietly deleted. The article notes what was wrong and what it says now, and the Last updated date changes. The policy is on the ",
      },
      { text: "Corrections", href: "/corrections/" },
      { text: " page." },
    ],
  },
  {
    question: "Where is the AI image disclosure?",
    parts: [
      {
        text: "Images on this site are AI-generated photorealistic illustrations of the subject. They do not depict real identifiable people or actual news events, and they do not carry a visible AI caption. The disclosure is on the ",
      },
      { text: "disclaimer", href: "/disclaimer/" },
      { text: "." },
    ],
  },
  {
    question: "How do I contact the desk?",
    parts: [
      { text: "Send a message through the " },
      { text: "contact form", href: "/contact/" },
      {
        text: ". The desk does not publish a street address. A message is emailed to the site owner only to respond and is not sold.",
      },
    ],
  },
];

export function faqAnswerText(item) {
  return item.parts.map((part) => part.text).join("");
}

export default faq;
