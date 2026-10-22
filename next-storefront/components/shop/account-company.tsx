import type { MemberProfile } from "@/graphql/types";
import { roleAllowances } from "@/lib/company-role";
import type { ShopCopy } from "@/lib/shop-copy";
import styles from "./order.module.css";

export function AccountCompany({
  profile,
  copy,
}: {
  profile: MemberProfile;
  copy: ShopCopy;
}) {
  const { company, priceList } = profile;
  if (!company && !priceList) return null;

  return (
    <section className={styles.accountSection}>
      <h2 className={styles.sectionTitle}>{copy.yourCompany}</h2>
      <dl className={`shop-card ${styles.companyFacts}`}>
        {company?.name ? (
          <div>
            <dt>{copy.company}</dt>
            <dd>{company.name}</dd>
          </div>
        ) : null}
        {company ? (
          <div>
            <dt>{copy.companyRole}</dt>
            <dd>{company.role}</dd>
          </div>
        ) : null}
        {priceList ? (
          <div>
            <dt>{copy.priceList}</dt>
            <dd>{priceList.name}</dd>
          </div>
        ) : null}
        {company ? (
          <div>
            <dt>{copy.roleAllows}</dt>
            <dd>
              <ul className={styles.allowances}>
                {roleAllowances(company, copy).map((allowance) => (
                  <li key={allowance}>{allowance}</li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}
      </dl>
      {company ? <p className="shop-muted">{copy.rolesManagedNote}</p> : null}
    </section>
  );
}
