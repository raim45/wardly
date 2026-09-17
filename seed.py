"""Populate the database with made-up data.

Re-runnable: drops every table and recreates it, so running this twice leaves
exactly the same database as running it once.

    python seed.py

Shape of the data (README2 stage 2): 3 wards, 9 patients at 3 per ward,
8 users covering every role, 2-3 records per patient.

The cast is arranged so the demo script in README2 works:
Nurse Chidinma Okafor is on Ward 3 and is assigned to 2 of its 3 patients, and
Dr. Amaka Obi is also on Ward 3 but is *not* assigned to Halima Yusuf — so
opening Halima as Dr. Obi fails on the assignment check alone.
"""

from db import Base, SessionLocal, engine
from models import AccessLog, Assignment, Patient, Record, User

PASSWORD = "demo"  # every account; plaintext, prototype only

WARDS = ["Ward 3", "Ward 4", "Ward 7"]

# (username, name, role, ward)
USERS = [
    ("aobi", "Dr. Amaka Obi", "doctor", "Ward 3"),
    ("tbakare", "Dr. Tunde Bakare", "doctor", "Ward 3"),
    ("neze", "Dr. Ngozi Eze", "doctor", "Ward 7"),
    ("cokafor", "Nurse Chidinma Okafor", "nurse", "Ward 3"),
    ("sadeyemi", "Nurse Sam Adeyemi", "nurse", "Ward 4"),
    ("inwosu", "Ifeoma Nwosu", "lab_staff", "Ward 3"),
    ("ybello", "Yusuf Bello", "records_clerk", "Ward 4"),
    ("gadeleke", "Grace Adeleke", "admin", "Ward 7"),
]

# (name, ward, is_admitted)
PATIENTS = [
    ("Halima Yusuf", "Ward 3", True),
    ("Emeka Nwosu", "Ward 3", True),
    ("Bolanle Adesanya", "Ward 3", False),
    ("Chidi Okonkwo", "Ward 4", True),
    ("Aisha Mohammed", "Ward 4", True),
    ("Femi Adebayo", "Ward 4", True),
    ("Zainab Ibrahim", "Ward 7", True),
    ("Obinna Eke", "Ward 7", True),
    ("Titi Lawal", "Ward 7", False),
]

# (username, patient name) — deliberately partial: only some users, some patients.
#
# Note the gaps, which are what the demo turns on:
#   - Dr. Amaka Obi is on Ward 3 but is not assigned to Halima Yusuf
#   - Bolanle Adesanya is on Ward 3 but is assigned to nobody
#   - Grace Adeleke has no assignments: an admin's screen is the audit log, and
#     the role table gives admin no patient record access at all
ASSIGNMENTS = [
    ("cokafor", "Halima Yusuf"),
    ("cokafor", "Emeka Nwosu"),
    ("aobi", "Emeka Nwosu"),
    ("aobi", "Bolanle Adesanya"),
    ("tbakare", "Halima Yusuf"),
    ("neze", "Zainab Ibrahim"),
    ("neze", "Obinna Eke"),
    ("sadeyemi", "Chidi Okonkwo"),
    ("sadeyemi", "Aisha Mohammed"),
    ("inwosu", "Emeka Nwosu"),
    ("ybello", "Chidi Okonkwo"),
]

# patient name -> [(type, content), ...]
#
# Each patient carries 2-3 records. The mix is chosen per patient so that the
# role table produces an interesting screen: Halima Yusuf, for instance, has
# note + result + prescription, so her assigned nurse sees two sections and
# finds Test Results visibly restricted.
RECORDS = {
    "Halima Yusuf": [
        # The demo patient carries all four record types on purpose, so the
        # detail page renders all four sections: a nurse sees two and finds two
        # restricted, and the doctor's override reveals the two that were hidden.
        ("admin_info", "Insurance: Reliance HMO #RL-8842. Next of kin: Musa Yusuf, "
                       "0806 555 0198. Admitted via A&E on 14 September."),
        ("note", "Admitted via A&E with a three-day history of fever and right-sided "
                 "pleuritic chest pain. Crackles at the right base on auscultation. "
                 "Started on IV antibiotics."),
        ("result", "Chest X-ray: right lower lobe consolidation. WBC 14.8 x10^9/L, "
                   "CRP 96 mg/L. Sputum culture pending."),
        ("prescription", "Ceftriaxone 1g IV twice daily. Azithromycin 500mg IV once "
                         "daily. Paracetamol 1g PRN."),
    ],
    "Emeka Nwosu": [
        ("note", "Day 4 post-elective inguinal hernia repair. Wound clean and dry with "
                 "no signs of infection. Mobilising independently."),
        ("result", "FBC: Hb 13.2 g/dL, WBC 7.4 x10^9/L. Urea and electrolytes within "
                   "normal limits."),
        ("prescription", "Co-codamol 30/500 two tablets four times daily PRN. "
                         "Lactulose 15ml at night."),
    ],
    "Bolanle Adesanya": [
        ("note", "Type 2 diabetes review. Reports good adherence to metformin and no "
                 "hypoglycaemic episodes since last visit."),
        ("admin_info", "Insurance: Hygeia HMO #HG-4471. Next of kin: Ade Adesanya, "
                       "0803 555 0142. Annual review due in March."),
    ],
    "Chidi Okonkwo": [
        ("note", "Admitted with acute exacerbation of asthma. Responding well to "
                 "nebulised salbutamol, peak flow improving steadily."),
        ("result", "Peak flow 380 L/min on admission, 510 L/min after treatment. "
                   "SpO2 97% on room air."),
        ("admin_info", "Insurance: Reliance HMO #RL-2210. Pre-authorisation approved "
                       "to discharge. Employer: Lagos State Ministry of Works."),
    ],
    "Aisha Mohammed": [
        ("note", "Antenatal visit at 32 weeks. Blood pressure 118/74 with no "
                 "proteinuria. Fetal heart rate 142 bpm."),
        ("prescription", "Ferrous sulphate 200mg once daily. Folic acid 5mg once daily."),
    ],
    "Femi Adebayo": [
        ("result", "Malaria parasite screen: Plasmodium falciparum trophozoites seen. "
                   "Packed cell volume 31%."),
        ("prescription", "Artemether/lumefantrine 80/480mg twice daily for three days. "
                         "Paracetamol 1g three times daily PRN."),
    ],
    "Zainab Ibrahim": [
        ("note", "Admitted for investigation of progressive shortness of breath. "
                 "Echocardiogram requested, cardiology review arranged."),
        ("result", "Echocardiogram: moderate left ventricular systolic dysfunction, "
                   "ejection fraction 38%. ECG: sinus rhythm."),
        ("prescription", "Furosemide 40mg once daily. Ramipril 2.5mg once daily. "
                         "Carvedilol 3.125mg twice daily."),
    ],
    "Obinna Eke": [
        ("note", "Chronic kidney disease stage 4 reviewed in clinic. Advised on dietary "
                 "restriction. Renal ultrasound arranged."),
        ("result", "Creatinine 3.1 mg/dL, eGFR 24 mL/min. Potassium 5.2 mmol/L."),
    ],
    "Titi Lawal": [
        ("prescription", "Insulin glargine 18 units at night. Metformin 1g twice daily."),
        ("admin_info", "Insurance: AXA Mansard #AX-9107. Attending the diabetes "
                       "education programme."),
    ],
}


def main():
    print(f"Connecting to {engine.url.render_as_string(hide_password=True)}")
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    print("Dropped and recreated tables.\n")

    with SessionLocal() as db:
        users = {}
        for username, name, role, ward in USERS:
            user = User(name=name, username=username, password=PASSWORD, role=role, ward=ward)
            db.add(user)
            users[username] = user

        patients = {}
        for name, ward, is_admitted in PATIENTS:
            patient = Patient(name=name, ward=ward, is_admitted=is_admitted)
            db.add(patient)
            patients[name] = patient

        # Flush so every user and patient has an id before we wire them together.
        db.flush()

        for username, patient_name in ASSIGNMENTS:
            db.add(Assignment(user_id=users[username].id, patient_id=patients[patient_name].id))

        for patient_name, entries in RECORDS.items():
            for record_type, content in entries:
                db.add(Record(patient_id=patients[patient_name].id,
                              type=record_type, content=content))

        db.commit()

        # Print the data back grouped by ward, so it is easy to eyeball.
        for ward in WARDS:
            ward_users = [u for u in USERS if u[3] == ward]
            ward_patients = [(n, adm) for n, w, adm in PATIENTS if w == ward]
            print(f"{ward}")
            print(f"  staff:    {', '.join(u[1] for u in ward_users)}")
            for patient_name, admitted in ward_patients:
                assigned = [users[un].name for un, pn in ASSIGNMENTS if pn == patient_name]
                types = [t for t, _ in RECORDS.get(patient_name, [])]
                status = "admitted" if admitted else "discharged"
                who = ", ".join(assigned) if assigned else "nobody assigned"
                print(f"  patient:  {patient_name:<18} {status:<11} "
                      f"{len(types)} records [{', '.join(types)}]")
                print(f"            assigned to: {who}")
            print()

        print(f"  {'users':<12}{len(USERS)}")
        print(f"  {'patients':<12}{len(PATIENTS)}")
        print(f"  {'assignments':<12}{len(ASSIGNMENTS)}")
        print(f"  {'records':<12}{sum(len(v) for v in RECORDS.values())}")
        print(f"\nAll accounts use the password '{PASSWORD}'. For the demo script:")
        print("  cokafor   nurse,  Ward 3 - assigned to 2 of the ward's 3 patients")
        print("  aobi      doctor, Ward 3 - NOT assigned to Halima Yusuf")
        print("  gadeleke  admin,  Ward 7 - reads the audit log; no patient records")


if __name__ == "__main__":
    main()
