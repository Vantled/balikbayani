"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const PROVINCES = [
  "Batangas",
  "Cavite", 
  "Laguna",
  "Rizal",
  "Quezon"
]

const PESO_OFFICES = {
  "Cavite": [
    "Provincial PESO",
    "Alfonso",
    "Amadeo",
    "Bacoor",
    "Carmona",
    "Cavite City",
    "Dasmariñas",
    "General Emilio Aguinaldo",
    "General Mariano Alvarez (GMA)",
    "General Trias",
    "Imus",
    "Indang",
    "Kawit",
    "Maragondon",
    "Magallanes",
    "Mendez-Nunez",
    "Naic",
    "Noveleta",
    "Rosario",
    "Silang",
    "Tagaytay",
    "Tanza",
    "Ternate",
    "Trece Martires"
  ],
  "Laguna": [
    "Provincial PESO",
    "Alaminos",
    "Bay",
    "Biñan",
    "Calamba",
    "Famy",
    "Kalayaan",
    "Liliw",
    "Los Baños",
    "Luisiana",
    "Lumban",
    "Mabitac",
    "Magdalena",
    "Majayjay",
    "Nagcarlan",
    "Paete",
    "Pagsanjan",
    "Pakil",
    "Pangil",
    "Pila",
    "Rizal",
    "San Pablo",
    "San Pedro",
    "Siniloan",
    "Sta. Cruz"
  ],
  "Batangas": [
    "Provincial PESO",
    "Agoncillo",
    "Alitagtag",
    "Balayan",
    "Balete",
    "Batangas City",
    "Bauan",
    "Calaca",
    "Calatagan Municipal",
    "Cuenca",
    "Ibaan",
    "Laurel",
    "Lemery",
    "Lian",
    "Lipa",
    "Lobo",
    "Mabini",
    "Malvar",
    "Mataas na Kahoy",
    "Nasugbu",
    "Padre Garcia",
    "Rosario",
    "San Jose",
    "San Juan",
    "San Luis",
    "San Nicolas",
    "San Pascual",
    "Sta. Teresita",
    "Sto. Tomas",
    "Taal",
    "Tanauan",
    "Taysan",
    "Tuy"
  ],
  "Rizal": [
    "Provincial PESO",
    "Angono",
    "Antipolo",
    "Baras",
    "Binangonan",
    "Cainta",
    "Cardona",
    "Jalajala",
    "Morong",
    "Pililla",
    "Rodriguez",
    "San Mateo",
    "Tanay",
    "Taytay",
    "Teresa"
  ],
  "Quezon": [
    "Provincial PESO",
    "Agdangan",
    "Alabat",
    "Atimonan",
    "Burdeos",
    "Calauag",
    "Candelaria",
    "Catanauan",
    "Dolores",
    "General Luna",
    "General Nakar",
    "Guinayangan",
    "Gumaca",
    "Infanta",
    "Lopez Quezon",
    "Lucban",
    "Lucena",
    "Macalelon",
    "Mauban",
    "Mulanay",
    "Padre Burgos",
    "Pagbilao",
    "Panukulan",
    "Perez",
    "Pitogo",
    "Plaridel",
    "Polilio",
    "Quezon",
    "Real",
    "San Andres",
    "San Antonio",
    "Sariaya",
    "Tagkawayan",
    "Tiaong",
    "Tayabas",
    "Unisan"
  ]
}

interface PesoContactsFilterPanelProps {
	onClose: () => void
	onApply: (query: string) => void
	// Controlled values
	province: string
	setProvince: (value: string) => void
	pesoOffice: string
	setPesoOffice: (value: string) => void
	officeHead: string
	setOfficeHead: (value: string) => void
	email: string
	setEmail: (value: string) => void
	contactNumber: string
	setContactNumber: (value: string) => void
	onClear: () => void
}

export default function PesoContactsFilterPanel(props: PesoContactsFilterPanelProps) {
	const { 
		onClose, 
		onApply, 
		province, 
		setProvince, 
		pesoOffice, 
		setPesoOffice, 
		officeHead, 
		setOfficeHead, 
		email, 
		setEmail, 
		contactNumber, 
		setContactNumber, 
		onClear 
	} = props

	const handleClear = () => {
		onClear()
		onApply("")
		onClose()
	}

	const handleApply = () => {
		const parts: string[] = []
		if (province) parts.push(`province:${province}`)
		if (pesoOffice) parts.push(`peso_office:${pesoOffice}`)
		if (officeHead) parts.push(`office_head:${officeHead}`)
		if (email) parts.push(`email:${email}`)
		if (contactNumber) parts.push(`contact_number:${contactNumber}`)
		onApply(parts.join(","))
		onClose()
	}

	return (
		<div className="absolute top-12 left-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg p-4 w-[360px]">
			<div className="space-y-4">
				{/* Province */}
				<div>
					<Label className="text-sm font-medium mb-2 block">Province</Label>
					<select
						value={province}
						onChange={(e) => setProvince(e.target.value)}
						className="w-full p-2 border border-gray-300 rounded text-sm"
					>
						<option value="">All provinces</option>
						{PROVINCES.map(province => (
							<option key={province} value={province}>{province}</option>
						))}
					</select>
				</div>

				{/* PESO Office */}
				<div>
					<Label className="text-sm font-medium mb-2 block">PESO Office</Label>
					<select
						value={pesoOffice}
						onChange={(e) => setPesoOffice(e.target.value)}
						className="w-full p-2 border border-gray-300 rounded text-sm"
						disabled={!province}
					>
						<option value="">
							{province ? 'All PESO offices' : 'Please select a province first'}
						</option>
						{province && PESO_OFFICES[province as keyof typeof PESO_OFFICES]?.map(office => (
							<option key={office} value={office}>{office}</option>
						))}
					</select>
				</div>

				{/* Office Head */}
				<div>
					<Label className="text-sm font-medium mb-2 block">Office Head</Label>
					<Input
						placeholder="Enter office head name"
						value={officeHead}
						onChange={(e) => setOfficeHead(e.target.value)}
						className="w-full"
					/>
				</div>

				{/* Email */}
				<div>
					<Label className="text-sm font-medium mb-2 block">Email</Label>
					<Input
						placeholder="Enter email address"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="w-full"
					/>
				</div>

				{/* Contact Number */}
				<div>
					<Label className="text-sm font-medium mb-2 block">Contact Number</Label>
					<Input
						placeholder="Enter contact number"
						value={contactNumber}
						onChange={(e) => setContactNumber(e.target.value)}
						className="w-full"
					/>
				</div>

				{/* Action Buttons */}
				<div className="flex gap-2 pt-2">
					<Button variant="outline" onClick={handleClear} className="flex-1">
						Clear
					</Button>
					<Button onClick={handleApply} className="flex-1">
						Apply
					</Button>
				</div>
			</div>
		</div>
	)
}
