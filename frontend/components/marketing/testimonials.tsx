const TESTIMONIALS = [
  {
    quote:
      "I planned an entire anniversary weekend in ten minutes. The assistant just got what we wanted.",
    name: "Wanjiru K.",
    location: "Nairobi",
  },
  {
    quote:
      "Finally one place for the hidden gems I used to spend hours hunting for on Instagram.",
    name: "Brian O.",
    location: "Mombasa",
  },
  {
    quote:
      "Found a waterfall hike near Nyeri I never knew existed. Wapike is my go-to now.",
    name: "Aisha M.",
    location: "Nyeri",
  },
];

export function Testimonials() {
  return (
    <ul className="grid grid-cols-1 gap-gutter md:grid-cols-3">
      {TESTIMONIALS.map((testimonial) => (
        <li
          key={testimonial.name}
          className="flex flex-col gap-5 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-tonal"
        >
          <p className="font-headline-sm text-[20px] leading-relaxed text-primary">
            &ldquo;{testimonial.quote}&rdquo;
          </p>
          <div className="mt-auto flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container font-label-md text-label-md text-on-secondary-container"
            >
              {testimonial.name.charAt(0)}
            </span>
            <div>
              <p className="font-label-md text-label-md text-primary">
                {testimonial.name}
              </p>
              <p className="font-caption text-caption uppercase tracking-wide text-on-surface-variant">
                {testimonial.location}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
