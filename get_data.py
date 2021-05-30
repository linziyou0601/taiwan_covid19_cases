import json, re
import requests as rq
from datetime import datetime
from bs4 import BeautifulSoup
from git import Repo, remote

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
    for TOWN, population in TOWNS.items():
        ncov19[COUNTY][TOWN] = {"population": population, "cases": 0, "ratio": 0}
    ncov19[COUNTY]["其他"] = {"population": 0, "cases": 0, "ratio": 0}

# 統計
total = 0
for record in Age_County_Gender_19Cov:
    if record["縣市"]=="空值" or record["是否為境外移入"]=="是": continue
    COUNTY = record["縣市"].replace("台", "臺")
    TOWN = record["鄉鎮"].replace("台", "臺")
    ncov19[COUNTY][TOWN]["cases"] += int(record["確定病例數"])
    total += int(record["確定病例數"])
print(total)

for COUNTY, TOWNS in ncov19.items():
    for TOWN, val in TOWNS.items():
        if val["population"]!=0: ncov19[COUNTY][TOWN]["ratio"] = int(val["cases"]/val["population"]*100000+0.5)/10
write_json(ncov19, "ncov19.json")


# ========== NCOV 19 確診更新日期 ========== #
now = datetime.now()
last_download_date = now.strftime("%Y/%m/%d %H:%M:%S")
#response = rq.get("https://nidss.cdc.gov.tw/nndss/DiseaseMap?id=19CoV")
#soup = BeautifulSoup(response.text, "html.parser")
#text = str(soup.select_one("#appendContainer script"))
#matcher = re.search('hmJson.push\((.+?)\);', text)
#if matcher: 
    #hmJson = json.loads(matcher.group(1))
    #date = hmJson["credits_text"][15:]

write_json({
    "ncov19-date": "每日清晨",
    "population-date": "2021/04",
    "last-download-date": last_download_date
}, "data_version.json")


repo_dir = 'C:\\github_workspace\\taiwan_covid19_cases'
repo = Repo(repo_dir)
file_list = [
    'C:\\github_workspace\\taiwan_covid19_cases\\data_version.json',
    'C:\\github_workspace\\taiwan_covid19_cases\\ncov19.json',
    'C:\\github_workspace\\taiwan_covid19_cases\\population.json'
]
commit_message = f"autocommit@{last_download_date}"
repo.index.add(file_list)
repo.index.commit(commit_message)
origin = repo.remote('origin')
origin.push()