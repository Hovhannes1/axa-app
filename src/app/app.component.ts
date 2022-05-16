import {Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {MatPaginator} from "@angular/material/paginator";
import {MatTableDataSource} from "@angular/material/table";
import {MatSort} from "@angular/material/sort";
import {HttpClient} from "@angular/common/http";
import {MatSidenav} from "@angular/material/sidenav";

import * as am5 from '@amcharts/amcharts5';
import {Root} from '@amcharts/amcharts5';
import * as am5hierarchy from '@amcharts/amcharts5/hierarchy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';

export interface BrastlewarkData {
  id: string;
  name: string;
  age: number;
  height: number;
  weight: number;
  hair_color: string;
}

export interface Professions {
  profession: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'axa-app';

  displayedColumns: string[] = ['id', 'name', 'age', 'height', 'weight', 'hair_color', 'action'];
  dataSource: MatTableDataSource<BrastlewarkData>;

  @ViewChild(MatPaginator)
  paginator: MatPaginator | any;
  @ViewChild(MatSort)
  sort: MatSort = new MatSort;
  @ViewChild('sidenav') sidenav: MatSidenav | any;
  showFriends: Root | any;
  public data: any = [];
  public reason = '';
  public isMobile: boolean = false;
  public selectedItemIndex: number = -1;
  public professions: Professions[] = [];
  private friendsSeries: any = {};

  private _subscriptions: any = [];

  constructor(private http: HttpClient) {
    this.dataSource = new MatTableDataSource();

    if (window.screen.width <= 420) {
      this.isMobile = true;
      // remove id & action from displayedColumns
      this.displayedColumns.splice(this.displayedColumns.indexOf('id'), 1);
      this.displayedColumns.splice(this.displayedColumns.indexOf('action'), 1);
      // off paginator
      this.dataSource.paginator = null;
    }
  }

  ngOnInit() {
    window.onresize = () => {
      if (window.innerWidth <= 420) { // mobile
        this.isMobile = true;
        // remove id from displayedColumns
        this.displayedColumns.splice(this.displayedColumns.indexOf('id'), 1);
        this.displayedColumns.splice(this.displayedColumns.indexOf('action'), 1);
        this.dataSource.paginator = null;
      } else {
        this.isMobile = false;
        // add id to displayedColumns if not present
        if (this.displayedColumns.indexOf('id') === -1) {
          this.displayedColumns.push('id');
          this.displayedColumns.push('action');
          this.dataSource.paginator = this.paginator;
        }
      }
    }
  }

  getData() {
    const url = 'https://raw.githubusercontent.com/rrafols/mobile_test/master/data.json';
    try {
      this._subscriptions.push(this.http.get(url).subscribe((res: any) => {
        this.data = res.Brastlewark;
        this.dataSource = new MatTableDataSource(this.data);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;

        this.preloadingImages();
      }));
    } catch (e) {
      console.error(e);
    }
  }

  preloadingImages() {
    let uniqImages: any = {};
    // find uniq images in data thumbnail and save in uniqImages
    let ind = 0;
    this.data.forEach((item: any) => {
      if (!uniqImages.hasOwnProperty(item.thumbnail)) {
        uniqImages[item.thumbnail] = ind;
        ind++;
      }
    });
    // preload images from uniqImages
    for (let key in uniqImages) {
      this.http.get(key).subscribe().unsubscribe();
    }
  }

  closeDetails(reason: string) {
    this.reason = reason;
    this.sidenav.close();
  }

  openDetails(index: number) {
    this.selectedItemIndex = index;
    this.sidenav.open();
    setTimeout(() => {
      this.loadCharacterFriends();
    }, 500);
    this.loadCharacterProfessions();
  }

  loadCharacterProfessions() {
    this.professions = [];
    this.data[this.selectedItemIndex].professions.forEach((item: any) => {
      this.professions.push({profession: item});
    });
  }

  loadCharacterFriends() {
    if (!this.showFriends) {
      this.showFriends = am5.Root.new("chartdiv");

      this.showFriends.setThemes([
        am5themes_Animated.new(this.showFriends)
      ]);

      let container = this.showFriends.container.children.push(am5.Container.new(this.showFriends, {
        width: am5.percent(100),
        height: am5.percent(100),
        layout: this.showFriends.verticalLayout
      }));

      this.friendsSeries = container.children.push(am5hierarchy.ForceDirected.new(this.showFriends, {
        singleBranchOnly: false,
        downDepth: 1,
        topDepth: 1,
        minRadius: 10,
        maxRadius: 60,
        initialDepth: 1,
        valueField: "value",
        categoryField: "name",
        childDataField: "children",
        idField: "name",
        linkWithField: "linkWith",
        manyBodyStrength: -15,
        centerStrength: 0.1
      }));

      this.friendsSeries.get("colors")?.setAll({
        step: 2
      });

      this.friendsSeries.links.template.set("strength", 0.5);
    }

    let data = {
      value: 10,
      children: [
        {
          name: this.data[this.selectedItemIndex].name,
          value: Math.floor(this.data[this.selectedItemIndex].weight * 100) / 100,
          children: []
        }
      ]
    };

    this.data[this.selectedItemIndex].friends.forEach((friend: string) => {
      data.children[0].children.push({
        // @ts-ignore
        name: friend,
        // @ts-ignore
        value: Math.floor(this.data.find((item: any) => item.name === friend).weight * 100) / 100
      });
    });

    this.friendsSeries.data.setAll([]);
    this.friendsSeries.data.setAll([data]);
    this.friendsSeries.set("selectedDataItem", this.friendsSeries.dataItems[0]);

    this.friendsSeries.appear(320, 100);
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  ngOnDestroy(): void {
    this._subscriptions.forEach((item: any) => {
      item.unsubscribe();
    });
  }
}
