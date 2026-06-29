export default function Flag({ country, size = 32 }: { country: string; size?: number }) {
  const code = country.toLowerCase();
  return (
    <img
      className="flag-img"
      src={`https://flagcdn.com/w80/${code}.png`}
      width={size}
      height={Math.round(size * 0.75)}
      alt={`${country} flag`}
      loading="lazy"
    />
  );
}
