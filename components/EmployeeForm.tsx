"use client";


import {
  CalendarDays,
  Check,
  ChevronDown,
  IndianRupee,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  Search,
  UserRound,
  X,
} from "lucide-react";
import CountriesService from "@/services/CountriesService";
import type { Country } from "@/types/country.types";
import type { CreateEmployeeDto, Employee } from "@/types/employee.types";
import { extractArrayPayload } from "@/utils/response";

export interface EmployeeFormData extends CreateEmployeeDto {
  isActive?: boolean;
}

interface EmployeeFormProps {
  initialData?: Partial<Employee>;
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  isLoading?: boolean;
  submitButtonText?: string;
  isEditing?: boolean;
  showAddress?: boolean;
  onCancel?: () => void;
}

const fallbackCountry: Country = {
  id: "IN",
  name: "India",
  code: "IN",
  dialling_code: "+91",
  flag: "",
};

const todayInput = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
};

const formatDateInput = (value?: string) =>
  value && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : todayInput();

const sanitizePhone = (value: string) => value.replace(/[^0-9]/g, "").slice(0, 15);
const sanitizeMoney = (value: string) =>
  value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");

export default function EmployeeForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitButtonText = "Save Employee",
  isEditing = false,
  showAddress = true,
  onCancel,
}: EmployeeFormProps) {
  const SubmitIcon = isEditing ? Save : Plus;
  const [countries, setCountries] = useState<Country[]>([]);
  const [countryLoading, setCountryLoading] = useState(true);
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [form, setForm] = useState({
    name: initialData?.name || "",
    phone: initialData?.phone || "",
    email: initialData?.email || "",
    address: initialData?.address || "",
    dailySalary: initialData?.dailySalary ? String(initialData.dailySalary) : "",
    joiningDate: formatDateInput(initialData?.joiningDate),
    isActive: initialData?.isActive ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;

    const loadCountries = async () => {
      try {
        setCountryLoading(true);
        const response = await CountriesService.fetchAllCategory();
        const list = extractArrayPayload<Country>(response, ["countries"]);

        if (!mounted) return;

        setCountries(list);
        const fromInitial = list.find(
          (country) =>
            country.code === initialData?.countryCode ||
            country.dialling_code === initialData?.diallingCode,
        );
        const india = list.find(
          (country) =>
            country.code === "IN" ||
            country.dialling_code === "+91" ||
            country.name?.toLowerCase() === "india",
        );

        setSelectedCountry(fromInitial || india || list[0] || fallbackCountry);
      } catch (error) {
        console.log("[EmployeeForm] Countries load failed:", error);
        if (mounted) setSelectedCountry(fallbackCountry);
      } finally {
        if (mounted) setCountryLoading(false);
      }
    };

    loadCountries();
    return () => {
      mounted = false;
    };
  }, [initialData?.countryCode, initialData?.diallingCode]);

  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) return countries;

    return countries.filter(
      (country) =>
        country.name?.toLowerCase().includes(query) ||
        country.code?.toLowerCase().includes(query) ||
        country.dialling_code?.includes(query),
    );
  }, [countries, countrySearch]);

  const isDirty = useMemo(
    () =>
      Boolean(
        form.name.trim() ||
          form.phone.trim() ||
          form.email.trim() ||
          form.address.trim() ||
          form.dailySalary.trim(),
      ),
    [form],
  );

  const selectedCountryLabel = selectedCountry
    ? `${selectedCountry.flag ? `${selectedCountry.flag} ` : ""}${selectedCountry.name} (${
        selectedCountry.dialling_code
      })`
    : "Select country";

  const setField = (key: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const validate = () => {
    const next: Record<string, string> = {};

    if (form.name.trim().length < 2) next.name = "Employee name is required";
    if (!selectedCountry) next.country = "Select a country";
    if (!/^\d{4,15}$/.test(form.phone.trim())) next.phone = "Phone must be 4 to 15 digits";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = "Enter a valid email";
    if (!Number.isFinite(Number(form.dailySalary)) || Number(form.dailySalary) < 0) {
      next.dailySalary = "Daily salary must be a valid amount";
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.joiningDate)) {
      next.joiningDate = "Joining date must be YYYY-MM-DD";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate() || !selectedCountry) return;

    await onSubmit({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim().toLowerCase(),
      address: form.address.trim(),
      countryCode: selectedCountry.code || selectedCountry.id || "IN",
      diallingCode: selectedCountry.dialling_code || "+91",
      dailySalary: Number(form.dailySalary),
      joiningDate: form.joiningDate,
      ...(isEditing ? { isActive: form.isActive } : {}),
    });
  };

  return (
    <form className="employee-form-shell" onSubmit={handleSubmit}>
      <div className="employee-form-grid">
        <label className="employee-field">
          <span>Employee Name</span>
          <div className={`employee-input ${errors.name ? "has-error" : ""}`}>
            <UserRound size={18} />
            <input
              value={form.name}
              onChange={(event) => setField("name", event.target.value)}
              placeholder="Enter employee name"
              disabled={isLoading}
            />
          </div>
          {errors.name ? <small>{errors.name}</small> : null}
        </label>

        <div className="employee-field employee-country-field">
          <span>Country</span>
          <button
            className={`employee-input employee-select-button ${errors.country ? "has-error" : ""}`}
            type="button"
            onClick={() => setCountryOpen((current) => !current)}
            disabled={isLoading || countryLoading}
            aria-expanded={countryOpen}
          >
            <span className="employee-select-text">
              {countryLoading ? "Loading countries..." : selectedCountryLabel}
            </span>
            <ChevronDown size={18} />
          </button>
          {errors.country ? <small>{errors.country}</small> : null}

          {countryOpen ? (
            <div className="employee-country-menu">
              <div className="employee-country-search">
                <Search size={16} />
                <input
                  value={countrySearch}
                  onChange={(event) => setCountrySearch(event.target.value)}
                  placeholder="Search country"
                  autoFocus
                />
                {countrySearch ? (
                  <button type="button" onClick={() => setCountrySearch("")} aria-label="Clear country search">
                    <X size={15} />
                  </button>
                ) : null}
              </div>

              <div className="employee-country-list">
                {filteredCountries.length ? (
                  filteredCountries.map((country) => {
                    const active =
                      selectedCountry?.code === country.code &&
                      selectedCountry?.dialling_code === country.dialling_code;
                    return (
                      <button
                        className={`employee-country-option ${active ? "is-active" : ""}`}
                        key={`${country.code}-${country.dialling_code}-${country.id}`}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(country);
                          setCountryOpen(false);
                          setCountrySearch("");
                          setErrors((current) => ({ ...current, country: "" }));
                        }}
                      >
                        <span>
                          {country.flag ? `${country.flag} ` : ""}
                          {country.name}
                        </span>
                        <b>{country.dialling_code}</b>
                        {active ? <Check size={16} /> : null}
                      </button>
                    );
                  })
                ) : (
                  <div className="employee-country-empty">No countries found</div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <label className="employee-field">
          <span>Phone Number</span>
          <div className={`employee-input employee-phone-input ${errors.phone ? "has-error" : ""}`}>
            <span className="employee-dial-code">{selectedCountry?.dialling_code || "+91"}</span>
            <Phone size={18} />
            <input
              value={form.phone}
              onChange={(event) => setField("phone", sanitizePhone(event.target.value))}
              placeholder="Mobile number"
              inputMode="numeric"
              disabled={isLoading}
            />
          </div>
          {errors.phone ? <small>{errors.phone}</small> : null}
        </label>

        <label className="employee-field">
          <span>Email</span>
          <div className={`employee-input ${errors.email ? "has-error" : ""}`}>
            <Mail size={18} />
            <input
              value={form.email}
              onChange={(event) => setField("email", event.target.value)}
              placeholder="employee@example.com"
              type="email"
              disabled={isLoading}
            />
          </div>
          {errors.email ? <small>{errors.email}</small> : null}
        </label>

        <label className="employee-field">
          <span>Daily Salary</span>
          <div className={`employee-input ${errors.dailySalary ? "has-error" : ""}`}>
            <IndianRupee size={18} />
            <input
              value={form.dailySalary}
              onChange={(event) => setField("dailySalary", sanitizeMoney(event.target.value))}
              placeholder="500"
              inputMode="decimal"
              disabled={isLoading}
            />
          </div>
          {errors.dailySalary ? <small>{errors.dailySalary}</small> : null}
        </label>

        <label className="employee-field">
          <span>Joining Date</span>
          <div className={`employee-input ${errors.joiningDate ? "has-error" : ""}`}>
            <CalendarDays size={18} />
            <input
              value={form.joiningDate}
              onChange={(event) => setField("joiningDate", event.target.value)}
              type="date"
              disabled={isLoading}
            />
          </div>
          {errors.joiningDate ? <small>{errors.joiningDate}</small> : null}
        </label>

        {showAddress ? (
          <label className="employee-field employee-field-wide">
            <span>Address</span>
            <div className="employee-input">
              <MapPin size={18} />
              <input
                value={form.address}
                onChange={(event) => setField("address", event.target.value)}
                placeholder="Address optional"
                disabled={isLoading}
              />
            </div>
          </label>
        ) : null}

        {isEditing ? (
          <label className="employee-status-toggle">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setField("isActive", event.target.checked)}
              disabled={isLoading}
            />
            <span>{form.isActive ? "Active employee" : "Inactive employee"}</span>
          </label>
        ) : null}
      </div>

      <div className="employee-form-actions">
        {onCancel ? (
          <button className="employee-secondary-button" type="button" onClick={onCancel} disabled={isLoading}>
            Cancel
          </button>
        ) : null}
        <button className="employee-primary-button" type="submit" disabled={isLoading || !isDirty}>
          <SubmitIcon size={18} />
          <span>{isLoading ? "Saving..." : submitButtonText}</span>
        </button>
      </div>
    </form>
  );
}
