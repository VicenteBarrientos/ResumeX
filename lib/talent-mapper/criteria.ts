import type { SourcingCriteria } from "@/lib/talent-mapper/types";

/** Label shown near the scientific sourcing demo loader. */
export const SCIENTIFIC_DEMO_LABEL =
  "Scientific sourcing demo inspired by a real-world research search";

/**
 * Scientific sourcing demo inspired by a real-world research search.
 * Not an official employer job description.
 */
export const SCIENTIFIC_DEMO_JD = `Scientist — Virology and Experimental Biology
Cambridge, Massachusetts

Label: ${SCIENTIFIC_DEMO_LABEL}

About the role
We are seeking a hands-on experimental scientist to support virology and molecular biology work in a research-intensive laboratory environment. The role emphasizes practical wet-lab competence, careful experimental design, and clear documentation rather than prestige signaling alone.

Core responsibilities
- Perform viral rescue and reverse genetics workflows
- Execute molecular cloning and related construct generation
- Maintain mammalian cell culture systems and perform transfection
- Run PCR / qPCR assays and interpret results
- Work with influenza, coronaviruses, or other relevant viral systems under appropriate biosafety practices
- Contribute to laboratory operations, reproducibility, and biosecurity-minded practices

Preferred qualifications
- Experience designing experiments independently
- Recent hands-on wet-lab work
- Experience mentoring research associates
- Interest in biosecurity, biological risk, or empirical evaluation of biological systems

Location
Cambridge, Massachusetts (on-site / hybrid research setting; remote-only is not the primary mode)

Notes for sourcing
Prioritize public evidence of techniques and viral systems over job titles alone. Treat publication affiliations as likely institution signals requiring recruiter validation.
`;

/**
 * Pre-extracted sourcing criteria for the scientific demo role.
 */
export function getDemoCriteria(): SourcingCriteria {
  return {
    roleTitle: "Scientist — Virology and Experimental Biology",
    roleSummary:
      "Hands-on experimental scientist focused on virology and molecular biology techniques in a research laboratory setting in Cambridge, Massachusetts. Prioritize public evidence of viral rescue, reverse genetics, cloning, cell culture, transfection, and PCR/qPCR work with relevant viral systems.",
    requiredTechniques: [
      "Viral rescue",
      "Reverse genetics",
      "Molecular cloning",
      "Mammalian cell culture",
      "Transfection",
      "PCR or qPCR",
    ],
    preferredTechniques: [
      "Independent experimental design",
      "Recent hands-on wet-lab work",
      "Mentoring research associates",
      "Biosecurity or biological risk evaluation",
    ],
    researchAreas: [
      "Virology",
      "Experimental biology",
      "Molecular biology",
    ],
    organismsOrSystems: [
      "Influenza",
      "Coronaviruses",
      "Relevant viral systems",
    ],
    adjacentTerms: [
      "Recombinant virus generation",
      "Rescue system",
      "Viral reverse genetics",
      "Plasmid transfection",
      "qPCR assay",
    ],
    senioritySignals: [
      "Independent experimental design",
      "Mentoring research associates",
      "First author",
      "Corresponding author",
    ],
    location: {
      city: "Cambridge",
      region: "Massachusetts",
      country: "US",
      remoteAllowed: false,
    },
    publicationYearFrom: 2015,
    exclusions: [
      "Purely computational only with no wet-lab evidence",
      "Retracted work without careful review",
    ],
    recruiterNotes: [
      "Scientific sourcing demo inspired by a real-world research search",
      "Do not treat publication affiliation as confirmed current employment",
      "Scores reflect research relevance only; recruiter validation required",
    ],
  };
}
