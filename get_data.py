import json, re
import requests as rq
from bs4 import BeautifulSoup

def write_json(obj, filename=''):
    with open(filename, 'w+', encoding="utf-8") as wf:
        json.dump(obj, wf)

def read_json(filename=''):
    with open(filename, 'r', encoding="utf-8") as rf:
        return json.load(rf)

# ========== 人口數 ========== #
population = {}
total = 0
for page in range(1,5):
    resp = rq.get(url=f'https://www.ris.gov.tw/rs-opendata/api/v1/datastore/ODRP061/11004?page={page}')
    responseData = resp.json()["responseData"]
    for item in responseData:
        COUNTY = item["site_id"][:3].replace("台", "臺")
        TOWN = item["site_id"][3:].replace("台", "臺")
        if COUNTY not in population: population[COUNTY] = {}
        if TOWN not in population[COUNTY]: population[COUNTY][TOWN] = 0
        population[COUNTY][TOWN] += int(item["people_total"])
        total += int(item["people_total"])
print(total)
write_json(population, "population.json")


# ========== NCOV 19 確診數 ========== #
resp = rq.get(url='https://od.cdc.gov.tw/eic/Age_County_Gender_19Cov.json')
Age_County_Gender_19Cov = resp.json()

# 初始化
ncov19 = read_json("population.json")
for COUNTY, TOWNS in ncov19.items():
    for TOWN in TOWNS.keys():
        ncov19[COUNTY][TOWN] = 0

# 統計
total = 0
for record in Age_County_Gender_19Cov:
    if record["縣市"] == "空值": continue
    COUNTY = record["縣市"].replace("台", "臺")
    TOWN = record["鄉鎮"].replace("台", "臺")
    if COUNTY not in ncov19: ncov19[COUNTY] = {}
    if TOWN not in ncov19[COUNTY]: ncov19[COUNTY][TOWN] = 0
    if record["是否為境外移入"]=="否": 
        ncov19[COUNTY][TOWN] += int(record["確定病例數"])
        total += int(record["確定病例數"])
print(total)
write_json(ncov19, "ncov19.json")


# ========== NCOV 19 確診更新日期 ========== #
response = rq.get("https://nidss.cdc.gov.tw/nndss/DiseaseMap?id=19CoV")
soup = BeautifulSoup(response.text, "html.parser")
text = str(soup.select_one("#appendContainer script"))
matcher = re.search('hmJson.push\((.+?)\);', text)
if matcher: 
    hmJson = json.loads(matcher.group(1))
    data = hmJson["credits_text"]
    print(hmJson["credits_text"][15:])
    write_json({
            "ncov19-date": hmJson["credits_text"][15:],
            "population-date": "2021/04"
        }, "data_version.json")

    