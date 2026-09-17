import {
  Badge,
  Button,
  Card,
  Id,
  Meta,
  Notice,
  OverrideBanner,
  PageBody,
  PageHeader,
  RestrictedCard,
  SectionHeading,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Timestamp,
  Tr,
  WardBadge,
} from '../components/index.js'
import { ACTION_LABELS, ACTION_VARIANTS } from '../lib/labels.js'

/**
 * The Stage 4 review surface, kept reachable at #/kitchen afterwards so the
 * design system stays checkable against the real pages as they are built.
 */

function Row({ label, children }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border py-3 last:border-b-0">
      <Meta className="w-40 shrink-0">{label}</Meta>
      {children}
    </div>
  )
}

function Block({ title, note, children }) {
  return (
    <Card className="mb-6">
      <SectionHeading>{title}</SectionHeading>
      {note ? <p className="mb-4 text-body text-ink-muted">{note}</p> : <div className="mb-4" />}
      {children}
    </Card>
  )
}

const PATIENTS = [
  { id: 1, name: 'Halima Yusuf', ward: 'Ward 3', admitted: true, yours: true },
  { id: 2, name: 'Emeka Nwosu', ward: 'Ward 3', admitted: true, yours: true },
  { id: 3, name: 'Bolanle Adesanya', ward: 'Ward 3', admitted: false, yours: false },
  { id: 4, name: 'Chidi Okonkwo', ward: 'Ward 4', admitted: true, yours: false },
  { id: 7, name: 'Zainab Ibrahim', ward: 'Ward 7', admitted: true, yours: false },
]

const LOG = [
  { id: 42, time: '17 Sep 2026, 14:22:08', user: 'Dr. Amaka Obi', role: 'doctor', patient: 'Halima Yusuf', action: 'emergency_override', reason: 'code blue, Ward 3' },
  { id: 41, time: '17 Sep 2026, 14:21:55', user: 'Dr. Amaka Obi', role: 'doctor', patient: 'Halima Yusuf', action: 'view_denied', reason: null },
  { id: 40, time: '17 Sep 2026, 14:21:40', user: 'Nurse Chidinma Okafor', role: 'nurse', patient: 'Halima Yusuf', action: 'view_denied', reason: null },
  { id: 39, time: '17 Sep 2026, 14:21:40', user: 'Nurse Chidinma Okafor', role: 'nurse', patient: 'Halima Yusuf', action: 'view_granted', reason: null },
]

export function KitchenSink() {
  return (
    <>
      <PageHeader
        title="Design system"
        context="Every component in every state — the Stage 4 review surface."
        action={<Button>Primary action</Button>}
      />

      <PageBody>
        <Block title="Emergency override banner" note="The single loudest moment in the app. Everything else stays calm so this stands out.">
          <OverrideBanner reason="code blue, Ward 3" timestamp="17 Sep 2026, 14:22:08" />
        </Block>

        <Block title="Type scale" note="Plex Serif for headings, Plex Sans for UI, Plex Mono for data only.">
          <div className="space-y-2">
            <div className="text-page-title font-serif">Page title · 26px Serif 600</div>
            <div className="text-section font-serif">Section heading · 17px Serif 600</div>
            <p className="text-body">
              Body and table text · 15px Sans 400. This is the density the clinical data wants.
            </p>
            <p>
              <Meta>Labels and meta · 13px Sans 500</Meta>
            </p>
            <p>
              <Timestamp>17 Sep 2026, 14:22:08 · Plex Mono 13px</Timestamp>
            </p>
          </div>
        </Block>

        <Block title="Button" note="Rectangular, 6px radius. Only badges are pill-shaped.">
          <Row label="primary">
            <Button>Sign in</Button>
            <Button disabled>Disabled</Button>
          </Row>
          <Row label="secondary">
            <Button variant="secondary">Cancel</Button>
            <Button variant="secondary" disabled>Disabled</Button>
          </Row>
          <Row label="override">
            <Button variant="override">Emergency override</Button>
            <Button variant="override" disabled>Disabled</Button>
          </Row>
          <Row label="quiet">
            <Button variant="quiet">Refresh</Button>
          </Row>
          <Row label="sizes">
            <Button size="md">Medium</Button>
            <Button size="sm" variant="secondary">Small</Button>
          </Row>
        </Block>

        <Block title="Badge" note="Pill-shaped, 15% tint background with full-strength text.">
          <Row label="states">
            <Badge variant="neutral">Clinical note</Badge>
            <Badge variant="granted">Visible</Badge>
            <Badge variant="denied">Restricted</Badge>
            <Badge variant="override">Emergency override</Badge>
          </Row>
          <Row label="wards">
            <WardBadge ward="Ward 3" />
            <WardBadge ward="Ward 4" />
            <WardBadge ward="Ward 7" />
          </Row>
          <Row label="unknown ward">
            <WardBadge ward="Ward 99" />
            <Meta>falls back to the ward-teal token</Meta>
          </Row>
        </Block>

        <Block title="Card" note="Surface, 1px border, 8px radius, 24px padding. No shadow.">
          <Card className="mb-4">
            <SectionHeading>Clinical note</SectionHeading>
            <p className="mt-2 text-body">
              Admitted via A&amp;E with a three-day history of fever and right-sided pleuritic
              chest pain. Crackles at the right base on auscultation.
            </p>
          </Card>
          <RestrictedCard />
        </Block>

        <Block
          title="Table — patient list"
          note="DESIGN.md gives the last column an empty header and a dot; the dot carries an sr-only label so the column is still announced."
        >
          <Table>
            <THead>
              <Tr>
                <Th>Patient</Th>
                <Th>Ward</Th>
                <Th>Status</Th>
                <Th className="w-16">
                  <span className="sr-only">Assigned to you</span>
                </Th>
              </Tr>
            </THead>
            <TBody>
              {PATIENTS.map((p) => (
                <Tr key={p.id} interactive>
                  <Td>{p.name}</Td>
                  <Td><WardBadge ward={p.ward} /></Td>
                  <Td>{p.admitted ? 'Admitted' : 'Discharged'}</Td>
                  <Td>
                    {p.yours ? (
                      <span className="block size-2 rounded-full bg-granted" title="Assigned to you" />
                    ) : (
                      <Meta>—</Meta>
                    )}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Block>

        <Block
          title="Table — audit log"
          note="No card wrapper: logs should look like logs. Timestamps are mono and never wrap."
        >
          <Table>
            <THead>
              <Tr>
                <Th>Time</Th>
                <Th>User</Th>
                <Th>Patient</Th>
                <Th>Action</Th>
                <Th>Reason</Th>
              </Tr>
            </THead>
            <TBody>
              {LOG.map((e) => (
                <Tr key={e.id}>
                  <Td><Timestamp>{e.time}</Timestamp></Td>
                  <Td>
                    {e.user}
                    <br />
                    <Meta>{e.role}</Meta>
                  </Td>
                  <Td>{e.patient}</Td>
                  <Td><Badge variant={ACTION_VARIANTS[e.action]}>{ACTION_LABELS[e.action]}</Badge></Td>
                  <Td>{e.reason ? e.reason : <Meta>—</Meta>}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Block>

        <Block title="Notice" note="The calm counterpart, for denied and empty states.">
          <Notice>
            <p className="text-body">
              You don&apos;t have access to this patient because you&apos;re not assigned to them.
            </p>
          </Notice>
        </Block>

        <footer className="pb-4">
          <Meta>
            <Id>stage-4</Id> · tokens from DESIGN.md
          </Meta>
        </footer>
      </PageBody>
    </>
  )
}
