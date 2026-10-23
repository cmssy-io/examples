import { SubmitFormDocument } from "@/graphql/generated/graphql";
import { authRequest } from "@/lib/cmssy/auth-request";
import { memberRequest } from "@/lib/cmssy/member-request";

export async function submitForm(
  formId: string,
  data: Record<string, unknown>,
  website: string,
) {
  const variables = { formId, input: { data, website: website || null } };
  const asMember = await memberRequest(SubmitFormDocument, () => variables);
  const result = asMember ?? (await authRequest(SubmitFormDocument, variables));
  return result.public.form.submit;
}
