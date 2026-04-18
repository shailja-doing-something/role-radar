import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const JOB_BOARDS: {
  name: string; slug: string; baseUrl: string;
  category: string; description: string; active: boolean;
}[] = [
  // ── Niche (real estate specific) ─────────────────────────────────────────
  {
    name: "SelectLeaders",
    slug: "selectleaders",
    baseUrl: "https://www.selectleaders.com",
    category: "niche",
    description: "Gold standard for commercial real estate roles. Used by CBRE, JLL, and top CRE firms.",
    active: true,
  },
  {
    name: "A.CRE Jobs",
    slug: "acre",
    baseUrl: "https://www.adventuresincre.com/jobs",
    category: "niche",
    description: "Best for finance-heavy roles: acquisitions, asset management, development, REPE.",
    active: true,
  },
  {
    name: "iHireRealEstate",
    slug: "ihire",
    baseUrl: "https://www.ihirerealestate.com",
    category: "niche",
    description: "Broad niche board: brokerage, property management, admin, marketing.",
    active: true,
  },
  {
    name: "CoreNet Global",
    slug: "corenet",
    baseUrl: "https://www.corenetglobal.org/careers",
    category: "niche",
    description: "Corporate real estate and workplace strategy roles.",
    active: false,
  },
  {
    name: "CREW Network",
    slug: "crew",
    baseUrl: "https://www.crewnetwork.org/careers",
    category: "niche",
    description: "Mid/senior CRE roles with strong networking emphasis.",
    active: false,
  },
  // ── Direct search (Gemini web search layers) ─────────────────────────────
  {
    name: "Team Websites",
    slug: "website",
    baseUrl: "",
    category: "direct",
    description: "Job postings found directly on team websites via Gemini web search.",
    active: true,
  },
  {
    name: "Brokerage Portals",
    slug: "brokerage_portal",
    baseUrl: "",
    category: "direct",
    description: "Job postings from brokerage career portals via Gemini web search.",
    active: true,
  },
  // ── General (high volume, real estate teams post here at scale) ───────────
  {
    name: "LinkedIn",
    slug: "linkedin",
    baseUrl: "https://www.linkedin.com/jobs",
    category: "general",
    description: "Best overall for real estate teams, brokerages, and proptech hiring.",
    active: true,
  },
  {
    name: "Indeed",
    slug: "indeed",
    baseUrl: "https://www.indeed.com",
    category: "general",
    description: "Massive volume: sales agents, analysts, operations.",
    active: true,
  },
  {
    name: "ZipRecruiter",
    slug: "ziprecruiter",
    baseUrl: "https://www.ziprecruiter.com",
    category: "general",
    description: "Good for brokerage and agency hiring pipelines.",
    active: true,
  },
  {
    name: "Glassdoor",
    slug: "glassdoor",
    baseUrl: "https://www.glassdoor.com/Job",
    category: "general",
    description: "Useful for team culture signals alongside job listings.",
    active: false,
  },
];

const TOP_100_TEAMS: { name: string; brokerage: string; location: string; website: string }[] = [
  { name: "Dean Aguilar Group",                          brokerage: "REAL Brokerage",              location: "San Diego, CA",                    website: "https://deanaguilargroup.com/" },
  { name: "Dave Seibert RE Group",                       brokerage: "REAL Brokerage",              location: "Richmond, VA",                     website: "https://www.daveseibertrealestategroup.com/" },
  { name: "The Ames Team (Chase Ames)",                  brokerage: "RE/MAX Associates",           location: "St. George, UT",                   website: "https://www.stgeorgehousehunter.com/" },
  { name: "Beth Hines Team",                             brokerage: "RE/MAX Southland II",         location: "Garner, NC",                       website: "https://www.bethhinesrealestate.com" },
  { name: "Jimmy Castro Group",                          brokerage: "RE/MAX Gold",                 location: "Fairfield, CA",                    website: "https://jimmycastro.remax.com/" },
  { name: "Jason Whittle All Pro Team",                  brokerage: "RE/MAX Lake of the Ozarks",  location: "Osage Beach, MO",                  website: "https://www.jasonwhittle.com" },
  { name: "Team Chris Boylan",                           brokerage: "EXIT Realty Premier",         location: "Massapequa, NY",                   website: "https://www.boylansells.com" },
  { name: "Team Vasile (Carl Vasile)",                   brokerage: "EXIT Real Estate",            location: "New Smyrna Beach, FL",             website: "https://www.floridarealestatepros.com/" },
  { name: "Marc Austin Properties",                      brokerage: "EXIT First Realty",           location: "Glen Allen, VA",                   website: "https://www.marcshomes.net/" },
  { name: "Domi Agency (Brooke Broady)",                 brokerage: "Epique Realty",               location: "Carmel, IN",                       website: "https://www.domiagency.com" },
  { name: "Abbott Martin Group",                         brokerage: "eXp Realty",                  location: "Miramar Beach, FL",                website: "https://abbottmartingroup.com" },
  { name: "The Collective (eXp)",                        brokerage: "eXp Realty",                  location: "Blaine, MN",                       website: "https://www.collective-realty.com/" },
  { name: "Triangle Experts Team",                       brokerage: "eXp Realty",                  location: "Raleigh, NC",                      website: "https://triangleexperts.com" },
  { name: "CAZA Group",                                  brokerage: "eXp Realty",                  location: "Reston, VA",                       website: "https://www.thecazagroup.com" },
  { name: "Team Peterson Jackson",                       brokerage: "eXp Realty",                  location: "Southfield, MI / Houston, TX",     website: "https://www.tpjsells.com" },
  { name: "Dan Chin Homes",                              brokerage: "Real Broker LLC",             location: "McFarland, WI",                    website: "https://www.danchinhomes.com/" },
  { name: "Team G.R.E.A.T.",                             brokerage: "eXp Realty",                  location: "Orlando, FL",                      website: "https://www.zillow.com/profile/GIL%20RAMOS%20EXP%20REALTY" },
  { name: "The Real Estate Leaders",                     brokerage: "eXp Realty",                  location: "Colts Neck, NJ",                   website: "https://therealestateleadersnj.com/" },
  { name: "The Gaydosh Team",                            brokerage: "eXp Realty",                  location: "Centerville, OH",                  website: "https://thegaydoshteam.com/" },
  { name: "Eric T. Neith Team",                          brokerage: "eXp Realty",                  location: "Lehigh Valley, PA",                website: "https://teamneith.com/" },
  { name: "Janice Overbeck Team",                        brokerage: "KW Atlanta North",            location: "Marietta, GA",                     website: "https://janiceoverbeck.com/" },
  { name: "The North Georgia Group",                     brokerage: "Independent",                 location: "Cumming, GA",                      website: "https://www.northgeorgiagroup.com" },
  { name: "Brittany Purcell & Associates",               brokerage: "KW Greater Athens",           location: "Watkinsville, GA",                 website: "https://www.brittanysells.com" },
  { name: "The Bell Team",                               brokerage: "KW Atlanta Partners",         location: "Braselton, GA",                    website: "https://breg.homes/" },
  { name: "Karafotias Team",                             brokerage: "KW Metro Atlanta",            location: "Decatur, GA",                      website: "https://karafotiasrealtygroup.com/" },
  { name: "Frank Montro Homes",                          brokerage: "KW Preferred Realty",         location: "Orland Park, IL",                  website: "http://frankmontrohomes.com/" },
  { name: "The Monzo Group",                             brokerage: "Keller Williams",             location: "Mount Clemens, MI",                website: "https://www.monzogroup.com" },
  { name: "Ronnie A Team",                               brokerage: "Keller Williams",             location: "Greater Atlanta",                  website: "https://ronnieateam.kw.com/" },
  { name: "Jose Medina & Associates",                    brokerage: "KW Legacy Group",             location: "North Canton, OH",                 website: "https://www.josesellshomes.com" },
  { name: "Lucido Agency",                               brokerage: "Keller Williams",             location: "Weston, FL",                       website: "https://www.boblucidoteam.com/" },
  { name: "KVA Group",                                   brokerage: "Keller Williams",             location: "Tampa Bay, FL",                    website: "https://kva-group.com" },
  { name: "The Ponte Group",                             brokerage: "Keller Williams",             location: "Fall River, MA",                   website: "https://pontegroupne.com" },
  { name: "The Hogan Group",                             brokerage: "Independent (formerly KW)",   location: "Richmond, VA",                     website: "https://hogangroupatkellerwilliamspremier.com" },
  { name: "The Shore Property Group",                    brokerage: "Keller Williams",             location: "Ocean/Monmouth County, NJ",        website: "https://www.theshorepropertygroup.com" },
  { name: "Center City Listings",                        brokerage: "Keller Williams",             location: "Philadelphia, PA",                 website: "https://www.cclre.com/" },
  { name: "The Condo Shop",                              brokerage: "Keller Williams",             location: "Philadelphia, PA",                 website: "https://www.thecondoshops.com" },
  { name: "Fine Homes Group International",              brokerage: "Keller Williams",             location: "Bedford, NH",                      website: "https://www.finehomesgroupintl.com" },
  { name: "Michael DeBiase Premium Properties Team",     brokerage: "Keller Williams",             location: "Connecticut",                      website: "https://www.mappmyhome.com" },
  { name: "The Chadderton Group",                        brokerage: "Keller Williams",             location: "Tampa Bay, FL",                    website: "https://www.chaddertongroup.com" },
  { name: "The Property Brokers Group",                  brokerage: "KW Sunset Corridor",          location: "Hillsboro, OR",                    website: "http://the-pbg.com" },
  { name: "Homes of Expansion Network",                  brokerage: "NextHome/Independent",        location: "Colorado Springs + multi",         website: "https://www.everyonedeserveshome.com/" },
  { name: "Lysi Bishop Real Estate",                     brokerage: "KW Realty Boise",             location: "Boise, ID",                        website: "https://www.lysibishop.com/" },
  { name: "Spokane Home Guy Group",                      brokerage: "Keller Williams",             location: "Richland, WA",                     website: "https://www.spokanehomeguy.com" },
  { name: "The Gunderman Group",                         brokerage: "KW Luxury",                   location: "Oakland, CA",                      website: "https://thegundermangroup.com/" },
  { name: "XSell Real Estate",                           brokerage: "Keller Williams",             location: "Phoenix/Scottsdale, AZ",           website: "https://xsellrealestategroup.com" },
  { name: "Boyenga Team",                                brokerage: "Compass (formerly KW)",       location: "San Jose, CA",                     website: "http://www.boyenga.com/" },
  { name: "Kappel Realty Group",                         brokerage: "Compass",                     location: "San Diego, CA",                    website: "https://kappelrealtygroup.com/" },
  { name: "Private Client Group OC",                     brokerage: "Keller Williams",             location: "Orange County, CA",                website: "https://privateclientgroupoc.com/" },
  { name: "Yanira Team",                                 brokerage: "LPT Realty",                  location: "Orlando, FL",                      website: "https://www.yanirasworld.com" },
  { name: "Xtreme by LPT",                              brokerage: "LPT Realty",                  location: "Davie, FL",                        website: "https://www.floridahomesbyxtreme.com/" },
  { name: "Elite Experience Team",                       brokerage: "LPT Realty",                  location: "Wesley Chapel, FL",               website: "https://www.Theelitefl.com" },
  { name: "MB&A Realty Group",                           brokerage: "LPT Realty",                  location: "Florida",                          website: "https://mbnarealty.com/" },
  { name: "Norkis & Co",                                 brokerage: "LPT Realty",                  location: "Orlando, FL",                      website: "https://norkisandco.com/" },
  { name: "All American Group",                          brokerage: "LPT Realty",                  location: "Florida",                          website: "https://allamericangrouplpt.com/" },
  { name: "Team Affinity",                               brokerage: "LPT Realty",                  location: "Orlando-Tampa, FL",                website: "https://www.teamaffinity.one/" },
  { name: "21 Mike Team",                                brokerage: "Century 21",                  location: "Ohio",                             website: "https://www.21mike.com/" },
  { name: "Be One",                                      brokerage: "LPT Realty",                  location: "Denver, CO",                       website: "https://www.beonepercentbetter.com/" },
  { name: "Big Block",                                   brokerage: "LPT Realty",                  location: "San Diego, CA",                    website: "https://bigblockrealty.com" },
  { name: "Blake Cory Home Selling Team",                brokerage: "eXp Realty",                  location: "Temecula, CA",                     website: "https://www.searchcaliforniahomes.net" },
  { name: "Culbertson and Gray Real Estate Team",        brokerage: "eXp Realty",                  location: "Sacramento, CA",                   website: "https://www.culbertsonandgray.com/" },
  { name: "Desrochers Realty Group",                     brokerage: "eXp Realty",                  location: "Edina, MN",                        website: "https://drealtyg.com/" },
  { name: "DRG Delhougne Real Estate Group",             brokerage: "eXp Realty",                  location: "Wildwood, MO",                     website: "https://www.drgstl.com" },
  { name: "Fast Real Estate",                            brokerage: "eXp Realty",                  location: "Oakland, CA",                      website: "https://www.fastagents.com/" },
  { name: "Global Partners Group",                       brokerage: "eXp Realty",                  location: "Louisville, KY",                   website: "https://www.expgpg.com" },
  { name: "Grant Johnson Group",                         brokerage: "Real Broker",                 location: "Arden Hills, MN",                  website: "https://www.grantjohnson.com" },
  { name: "Indy Home Pros Team",                         brokerage: "RE/MAX",                      location: "Indianapolis, IN",                 website: "http://www.indyhomepros.com" },
  { name: "Jason P. Sokody",                             brokerage: "Howard Hanna",                location: "Grand Island, NY",                 website: "https://www.sokodyteam.com" },
  { name: "Jay T. Pitts and Associates",                 brokerage: "RE/MAX",                      location: "Louisville, KY",                   website: "https://www.PittsTeam.com" },
  { name: "Jeff Cook Real Estate",                       brokerage: "LPT Realty",                  location: "Ladson, SC",                       website: "https://www.jeffcookrealestate.com" },
  { name: "Keaty Real Estate team",                      brokerage: "eXp Realty",                  location: "Lafayette, LA",                    website: "https://www.keatyrealestate.com/agents/" },
  { name: "Kerby & Cristina Real Estate Experts",        brokerage: "RE/MAX",                      location: "Plymouth, MN",                     website: "https://www.kerbyandcristina.com" },
  { name: "Monica Foster Team",                          brokerage: "eXp Realty",                  location: "League City, TX",                  website: "https://www.RealtyByMonica.com" },
  { name: "Paramount Home Group",                        brokerage: "LPT Realty",                  location: "Tampa, FL",                        website: "https://paramounthomegroup.com/" },
  { name: "Pat Mckenna Realtors",                        brokerage: "eXp Realty",                  location: "Marlton, NJ",                      website: "https://patmckennarealtors.com" },
  { name: "Platzke Real Estate Group",                   brokerage: "Coldwell Banker",             location: "Eden Prairie, MN",                 website: "https://www.PlatzkeRealEstateGroup.com" },
  { name: "Selling 321",                                 brokerage: "eXp Realty",                  location: "Melbourne, FL",                    website: "https://www.selling321.com" },
  { name: "SPACE",                                       brokerage: "LPT Realty",                  location: "Chandler, AZ",                     website: "https://www.spacere.com" },
  { name: "Strata Group Brokered by LPT Realty",         brokerage: "LPT Realty",                  location: "Lake Mary, FL",                    website: "https://thestratagroup.com" },
  { name: "Tamra Wade Team",                             brokerage: "RE/MAX",                      location: "Buford, GA",                       website: "https://www.tamrawade.com" },
  { name: "Team Galaxy",                                 brokerage: "RE/MAX",                      location: "Diamond Bar, CA",                  website: "https://team-galaxy-diamond-bar-ca.remax.com/" },
  { name: "Texas Connect Real Estate",                   brokerage: "LPT Realty",                  location: "Fort Worth, TX",                   website: "https://www.texasconnectrealty.com" },
  { name: "The Advisory Realty Group",                   brokerage: "eXp Realty",                  location: "Minnetonka, MN",                   website: "https://www.theadvisorymn.com" },
  { name: "The Ashton Real Estate Group",                brokerage: "RE/MAX",                      location: "Nashville, TN",                    website: "https://www.NashvillesMLS.com" },
  { name: "The Carin Nguyen Real Estate Network",        brokerage: "Real Broker",                 location: "Litchfield Park, AZ",              website: "https://www.azhomesold.com" },
  { name: "The Edrington Team",                          brokerage: "Berkshire Hathaway",          location: "Chattanooga, TN",                  website: "https://theedringtonteam.com/" },
  { name: "The Fletcher Team & Associates",              brokerage: "eXp Realty",                  location: "Monument, CO",                     website: "https://coloradohomefinder.net/" },
  { name: "The Franklin Team",                           brokerage: "eXp Realty",                  location: "Katy, TX",                         website: "https://www.thefranklinteaminc.com" },
  { name: "The House Depot Team",                        brokerage: "RE/MAX",                      location: "Maitland, FL",                     website: "https://the-house-depot-team-maitland-fl.remax.com/" },
  { name: "The Jane Lee Team",                           brokerage: "RE/MAX",                      location: "Lake Bluff, IL",                   website: "https://jl-luxury.com" },
  { name: "The Mike McCann Team",                        brokerage: "Keller Williams",             location: "Philadelphia, PA",                 website: "https://www.mccannteam.com/" },
  { name: "The Redbud Group",                            brokerage: "Keller Williams",             location: "Nashville, TN",                    website: "https://redbudgroup.com/" },
  { name: "The Robert Dekanski Team",                    brokerage: "RE/MAX",                      location: "Clark, NJ",                        website: "https://www.newjerseyrealestatenetwork.com/" },
  { name: "The Short Term Shop",                         brokerage: "RE/MAX",                      location: "Santa Rosa Beach, FL",             website: "https://www.theshorttermshop.com" },
  { name: "Vybe Realty Group",                           brokerage: "LPT Realty",                  location: "Towson, MD",                       website: "https://justvybe.com/" },
  { name: "Welch Real Estate brokered by eXp Realty",   brokerage: "eXp Realty",                  location: "Monroe, MI",                       website: "https://www.welchrealestateteam.com/" },
];

async function main() {
  // Upsert boards — never delete postings, patterns, or analysis.
  // FK constraint (JobPosting.source → JobBoard.slug) is safe as long as
  // we keep all existing slugs, which upsert guarantees.
  console.log("Seeding job boards...");
  for (const board of JOB_BOARDS) {
    await prisma.jobBoard.upsert({
      where:  { slug: board.slug },
      create: board,
      // Only refresh static metadata — never overwrite runtime state
      update: {
        name:        board.name,
        baseUrl:     board.baseUrl,
        category:    board.category,
        description: board.description,
      },
    });
  }
  console.log(`Seeded ${JOB_BOARDS.length} job boards.`);

  // Top100Teams: preserve any existing isaPresence/marketingOpsPresence values
  // set via the Signals dashboard before wiping and re-seeding.
  console.log("Seeding Top 100 Teams...");
  const existingTeams = await prisma.top100Team.findMany({
    select: { name: true, isaPresence: true, marketingOpsPresence: true },
  });
  const signalMap = new Map(existingTeams.map(t => [t.name, t]));
  await prisma.top100Team.deleteMany({});
  await prisma.top100Team.createMany({
    data: TOP_100_TEAMS.map(t => ({
      ...t,
      isaPresence:          signalMap.get(t.name)?.isaPresence          ?? "Unknown",
      marketingOpsPresence: signalMap.get(t.name)?.marketingOpsPresence ?? "Unknown",
    })),
  });
  console.log(`Seeded ${TOP_100_TEAMS.length} teams.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
