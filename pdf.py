import json
import os
import re
import requests


def parse_school(chunk: list[str]):
    start = chunk[0]
    dfe = start.index('DfE no')
    head = start.index('Headteacher')
    addr = ''
    data = {}
    for line in chunk:
        addr_part = line[:dfe].strip()
        addr += addr_part + '\n'
        if len(line) < head or line.startswith('01'):
            continue
        [ka, va] = re.split('  +', line[dfe:head].strip(), 1)
        [kb, vb] = re.split('  +', line[head:].strip(), 1)
        data[ka] = va
        data[kb] = vb

    return addr.strip(), data


def school_listing(page: str):
    lines = page.split('\n')
    chunk = []
    for line in lines:
        if 'DfE no' in line:
            chunk = []
        chunk.append(line)
        # phone
        if line.startswith('01'):
            yield parse_school(chunk)


def not_known_int(s: str):
    if s == 'Not known':
        return None
    return int(s)


def yes_no(s: str):
    if s == 'Yes':
        return True
    if s == 'No':
        return False
    return None

def offer_listing(page: str):
    lines = page.split('\n')
    building = None
    for line in lines:
        if len(line) > 10 and line[0].isdigit():
            if building:
                yield building
            building = {}
            [no, name, intake, tot_app, off, auth, dist, crit, miles, la] = re.split('  +', line)
            building['no'] = int(no)
            building['name'] = name
            building['intake'] = int(intake)
            building['tot_app'] = int(tot_app)
            building['off'] = int(off)
            building['auth'] = yes_no(auth)
            building['dist'] = not_known_int(dist)
            building['crit'] = not_known_int(crit)
            building['miles'] = float(miles)
            building['la'] = int(la)

        if building and line.startswith(' '):
            building['name'] += ' ' + line.strip()

        if building and 0 == len(line.strip()):
            yield building
            break


def main():
    pages = open('flk.txt', 'r').read().split('\f')
    school_list = []
    offer_list = []
    for i, page in enumerate(pages):
        if 'DfE no' in page:
            for school in school_listing(page):
                school_list.append(school)

        if 'Offer Day Outcome' in page:
            for offer in offer_listing(page):
                offer_list.append(offer)

    db = json.load(open('addr.json', 'r'))
    for (addr, data) in school_list:
        flat_addr = flatten_addr(addr)
        if flat_addr in db:
            continue
        r = requests.get('https://maps.googleapis.com/maps/api/geocode/json',
                         params={'address': flat_addr, 'key': os.environ['GOOGLE_API_KEY']})
        r.raise_for_status()
        db[flat_addr] = r.json()
        json.dump(db, open('addr.json', 'w'), indent=2)

    js = {}

    for (addr, data) in school_list:
        flat_addr = flatten_addr(addr)
        no = int(data['DfE no'])
        offer_details = [offer for offer in offer_list if offer['no'] == no]
        if len(offer_details) != 1:
            raise Exception('No offer details for ' + str(no))
        offer = offer_details[0]
        loc = db[flat_addr]['results'][0]['geometry']['location']
        js[no] = {'name': offer['name'],
                  'lat': loc['lat'], 'lng': loc['lng'],
                  'address': addr,
                  'headteacher': data['Headteacher'],
                  'website': data['Website'],
                  'age': data['Age'],
                  'status': data['Status'],
                  'pan': data['PAN'],
                  'intake': offer['intake'],
                  'totalApplications': offer['tot_app'],
                  'offers': offer['off'],
                  'distanceOffers': offer['dist'],
                  'criteriaOffers': offer['crit'],
                  'localAuthority': offer['la'],
                  'miles': offer['miles'],
                  'authority': offer['auth'],
                  }

    json.dump(js, open('schools.json', 'w'), indent=2)

def flatten_addr(addr):
    return ', '.join(addr.split('\n')[:-1])


if __name__ == '__main__':
    main()
