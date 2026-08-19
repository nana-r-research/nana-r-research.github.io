export const LICENSE_OPTIONS = [
  { value: "", label: "未設定", name: "", url: "" },
  { value: "cc-by-4.0", label: "CC BY 4.0", name: "Creative Commons Attribution 4.0 International", url: "https://creativecommons.org/licenses/by/4.0/" },
  { value: "cc-by-sa-4.0", label: "CC BY-SA 4.0", name: "Creative Commons Attribution-ShareAlike 4.0 International", url: "https://creativecommons.org/licenses/by-sa/4.0/" },
  { value: "cc-by-nc-4.0", label: "CC BY-NC 4.0", name: "Creative Commons Attribution-NonCommercial 4.0 International", url: "https://creativecommons.org/licenses/by-nc/4.0/" },
  { value: "cc-by-nc-sa-4.0", label: "CC BY-NC-SA 4.0", name: "Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International", url: "https://creativecommons.org/licenses/by-nc-sa/4.0/" },
  { value: "cc-by-nd-4.0", label: "CC BY-ND 4.0", name: "Creative Commons Attribution-NoDerivatives 4.0 International", url: "https://creativecommons.org/licenses/by-nd/4.0/" },
  { value: "cc-by-nc-nd-4.0", label: "CC BY-NC-ND 4.0", name: "Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International", url: "https://creativecommons.org/licenses/by-nc-nd/4.0/" },
  { value: "cc0-1.0", label: "CC0 1.0", name: "CC0 1.0 Universal", url: "https://creativecommons.org/publicdomain/zero/1.0/" },
  { value: "all-rights-reserved", label: "All rights reserved", name: "All rights reserved", url: "" },
] as const;

export function licenseByValue(value?: string) {
  return LICENSE_OPTIONS.find((license) => license.value === (value ?? ""));
}
