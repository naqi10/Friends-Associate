import { getKnownCities } from "@/lib/data";
import { Combobox } from "./Combobox";

/** City for any admin form: pick one already used, or type a new one (saved tidied, see cleanCity). */
export async function CityField({ label = "City", defaultValue, required }: { label?: string; defaultValue?: string; required?: boolean }) {
  const cities = await getKnownCities();
  return (
    <Combobox
      label={label}
      name="city"
      creatable
      required={required}
      defaultValue={defaultValue}
      placeholder="Choose or type a city"
      options={cities.map((c) => ({ value: c, label: c }))}
    />
  );
}
